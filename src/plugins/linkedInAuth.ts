import { AuthenticationManager } from '../interfaces/authenticationManager'

import { Request, Response } from 'express';
import { Client, TokenSet } from "openid-client";
import { UserManager } from '../interfaces/userManager';
import { auditLogger } from '../main';
import { LogCategory, Severity } from '../utils/constants';
import { getData } from '../utils/network';
let OpenIDClient = require("openid-client")

export class LinkedInAuthentication implements AuthenticationManager {
  private activeClient: Client | null = null;
  private config: { [key: string]: any };
  private userManager: UserManager;

  constructor(config: { [key: string]: any }, userManager: UserManager) {
    this.config = config;
    this.userManager = userManager;
    auditLogger.report(LogCategory.AUTH, Severity.INFO, "StaticIssuerClient", "https://www.linkedin.com", config.authenticationClientId, config.authenticationRedirectURIs, config.authenticationResponseTypes, config.authenticationMethod);
    let issuer = new OpenIDClient.Issuer({
      issuer: "linkedIn",
      authorization_endpoint: "https://www.linkedin.com/oauth/v2/authorization",
      token_endpoint: "https://www.linkedin.com/oauth/v2/accessToken",
      token_endpoint_auth_methods_supported: "client_secret_post"
    });
    this.activeClient = new issuer.Client({
      client_id: config.authenticationClientId,
      client_secret: config.authenticationClientSecret,
      redirect_uris: config.authenticationRedirectURIs,
      response_types: config.authenticationResponseTypes
    });
  }

  validate(token: string, req: Request, res: Response): void {
    if (this.activeClient) {
      auditLogger.report(LogCategory.AUTH, Severity.INFO, "ValidateNotAvailable", req.ip, req.headers["origin"], token);
      res.status(501).end();
    } else {
      auditLogger.report(LogCategory.AUTH, Severity.EMERGENCY, "ValidateNoAuthClient", req.ip, req.headers["origin"], token);
      res.status(503).end();
    }
  }

  refresh(session: Express.Session, callback: (refreshed: boolean) => void): void {
    if (this.activeClient) {
      if (session.activeTokens) {
        auditLogger.report(LogCategory.AUTH, Severity.INFO, "RefreshNotAvailable", session.id, session.ip);
        callback(false);
      } else {
        auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "NoRefreshTokenStored", session.id, session.ip);
        callback(false);
      }
    } else {
      auditLogger.report(LogCategory.AUTH, Severity.EMERGENCY, "RefreshNoAuthClient", session.id, session.ip);
    }
  }

  login(req: Request, session: Express.Session, res: Response): void {
    if (this.activeClient) {
      let redirectUrl = req.query.redirectUrl;
      if (redirectUrl) {
        try {
          let hostname = new URL(redirectUrl).hostname;
          if (this.config.validRedirectDomainLookup[hostname]) {
            session.redirectUrl = redirectUrl;
          } else {
            auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "LoginInvalidRedirect", session.id, session.ip, hostname);
            res.status(400).end();
            return;
          }
        } catch (e) {
          auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "LoginInvalidRedirect", session.id, session.ip);
          res.status(400).end();
          return;
        }
      } else {
        auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "LoginInvalidRedirect", session.id, session.ip);
        res.status(400).end();
        return;
      }

      session.state = OpenIDClient.generators.state();
      auditLogger.report(LogCategory.AUTH, Severity.INFO, "FirstLoginLeg", session.id, session.ip);
      res.redirect(this.activeClient.authorizationUrl({
        scope: this.config.authenticationScope,
        state: session.state
      }));
    } else {
      auditLogger.report(LogCategory.AUTH, Severity.EMERGENCY, "LoginNoAuthClient", session.id, session.ip);
      res.status(503).end();
    }
  }

  logout(req: Request, session: Express.Session, res: Response): void {
    if (this.activeClient) {
      if (session.activeTokens) {
        let redirectUrl = req.query.redirectUrl;
        if (redirectUrl) {
          try {
            let hostname = new URL(redirectUrl).hostname;
            if (!this.config.validRedirectDomainLookup[hostname]) {
              auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "LogoutInvalidRedirect", session.id, redirectUrl);
              res.status(400).end();
              return;
            }
          } catch (e) {
            auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "LogoutInvalidRedirect", session.id, redirectUrl);
            res.status(400).end();
            return;
          }

          auditLogger.report(LogCategory.AUTH, Severity.INFO, "LoggingOutRedirect", session.id, session.identity.preferred_username, redirectUrl);
          res.redirect(redirectUrl);
        } else {
          auditLogger.report(LogCategory.AUTH, Severity.INFO, "LoggingOut", session.id, session.identity.preferred_username);
          res.redirect(session.redirectUrl);
        }
        this.clearActiveTokens(session);
      } else {
        auditLogger.report(LogCategory.AUTH, Severity.INFO, "LoggingOutNoTokens", session.id);
        res.redirect(session.redirectUrl);
      }
    } else {
      auditLogger.report(LogCategory.AUTH, Severity.EMERGENCY, "LogoutNoAuthClient", session.id);
      res.status(503).end();
    }
  }

  getProfile(session: Express.Session, callback: (((found: boolean) => void) | Response)): void {
    if (this.activeClient) {
      if (session.activeTokens) {
        getData("api.linkedin.com",
          "/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),address,organizations,phoneNumbers)",
          {
            "Authorization": "Bearer " + session.activeTokens.access_token
          },
          (profile) => {
            let profileObj = JSON.parse(profile);
            getData("api.linkedin.com",
              "/v2/emailAddress?q=members&projection=(elements*(handle~))",
              {
                "Authorization": "Bearer " + session.activeTokens.access_token
              },
              (email) => {
                let emailObj = JSON.parse(email);
                session.identity = profileObj;
                profileObj.email = emailObj.elements[0]["handle~"].emailAddress;
                profileObj.preferred_username = profileObj.emailAddress + "-" + profileObj.id;
                if (callback instanceof Function) {
                  callback(true);
                } else {
                  callback.send(profileObj).end();
                }
              },
              (err) => {
                auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "GetAuthEmailFail", session.id, session.ip, err);
                if (callback instanceof Function) {
                  this.clearActiveTokens(session, callback);
                } else {
                  this.clearActiveTokens(session, () => {
                    callback.status(401).end();
                  });
                }
              });
          },
          (err) => {
            auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "GetAuthProfileFail", session.id, session.ip, err);
            if (callback instanceof Function) {
              this.clearActiveTokens(session, callback);
            } else {
              this.clearActiveTokens(session, () => {
                callback.status(401).end();
              });
            }
          });
      } else {
        auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "GetAuthProfileNoTokens", session.id, session.ip);
        if (callback instanceof Function) {
          callback(false);
        } else {
          callback.status(401).end();
        }
      }
    } else {
      auditLogger.report(LogCategory.AUTH, Severity.EMERGENCY, "GetProfileNoAuthClient", session.id, session.ip);
    }
  }

  private clearActiveTokens(session: Express.Session, callback?: (isLoggedIn: false) => void): void {
    delete session.activeTokens;
    delete session.accessTokenExpiration;
    session.save(() => {
      if (callback) callback(false);
    });
  }

  isLoggedIn(session: Express.Session, callback: (isLoggedIn: boolean) => void): void {
    if (session.activeTokens) {
      if (this.isAccessTokenExpired(session)) {
        this.clearActiveTokens(session, callback);
      } else {
        callback(true);
      }
    } else {
      callback(false);
    }
  }

  private isAccessTokenExpired(session: Express.Session): boolean {
    if (session.accessTokenExpiration) {
      return ((session.accessTokenExpiration - Date.now()) <= 0);
    }
    return true;
  }

  private adjustUserPermissions(session: Express.Session, userId: string, accessToken: string, callback: () => void): void {

    let arr = ["systemAdmin"];
    this.userManager.addUserRoles(userId, arr, (added: boolean) => {
      if (added) {
        auditLogger.report(LogCategory.AUTH, Severity.INFO, "AdjustingRoles", session.id, session.ip, userId, arr);
      }
      callback();
    });
  }

  redirect(req: Request, session: Express.Session, res: Response): void {
    if (this.activeClient) {

      this.activeClient.oauthCallback(
        this.config.authenticationRedirectURIs[0],
        this.activeClient.callbackParams(req),
        {
          state: session.state
        }).then((tokenSet: TokenSet) => {
          if (Object.keys(tokenSet).length != 0) {
            session.activeTokens = tokenSet;
            if (tokenSet.expires_at) {
              session.accessTokenExpiration = tokenSet["expires_at"] * 1000;
              this.getProfile(session, (found) => {
                if (found) {
                  this.adjustUserPermissions(session, session.identity.preferred_username,
                    session.activeTokens.access_token,
                    () => {
                      auditLogger.report(LogCategory.AUTH, Severity.INFO, "LoggedIn", session.id, session.ip, session.identity.preferred_username);
                      res.redirect(session.redirectUrl);
                    });
                } else {
                  auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "NoProfileIdentity", session.id, session.ip);
                  res.status(401).end();
                }
              });
            } else {
              console.log(tokenSet);
              auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "TokensDontExpire", session.id, session.ip);
              res.status(503).end();
            }
          } else {
            auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "NoTokensFound", session.id, session.ip);
            res.status(401).end();
          }
        }).catch((err) => {
          auditLogger.report(LogCategory.AUTH, Severity.CRITICAL, "RedirectFail", session.id, session.ip, err);
          res.status(401).end();
        });
    } else {
      auditLogger.report(LogCategory.AUTH, Severity.EMERGENCY, "RedirectNoAuthClient", session.id, session.ip);
      res.status(503).end();
    }
  }
}