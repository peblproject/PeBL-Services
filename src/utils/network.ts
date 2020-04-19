import * as https from 'https';
import { Response } from 'express';
import { IncomingMessage } from 'http';

export function postData(
  host: string,
  path: string,
  headers: { [key: string]: any },
  rawData: string,
  successCallback?: (incomingData: string) => void,
  failCallback?: (e: Error | { [key: string]: any }) => void): void {

  let data = (rawData.startsWith("\"") && rawData.endsWith("\"")) ? rawData.substring(1, rawData.length - 1) : rawData;

  var postOptions = {
    host: host,
    protocol: "https:",
    port: 443,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }

  Object.assign(postOptions.headers, headers); // Merge headers arg into postOptions
  var dataArr: string[] = [];
  const req = https.request(postOptions, function(resp: IncomingMessage) {
    resp.setEncoding("utf-8");
    resp.on("data", function(data) {
      dataArr.push(data);
    });
    resp.on("end", function() {
      //Check for errors in response
      if (dataArr.length > 0) {
        try {
          let o = JSON.parse(dataArr[0])
          if (o.errorId && failCallback)
            return failCallback(o);
        } catch (e) {
          //
        }
      }
      if (successCallback) {
        successCallback(dataArr.join(""));
      }
    });
  });
  req.on('error', function(e) {
    if (failCallback) {
      console.log(e);
      failCallback(e);
    }
  });
  req.write(data);
  req.end();
}

export function getData(
  host: string,
  path: string,
  headers: { [key: string]: any },
  successCallback?: (incomingData: string) => void,
  failCallback?: (e: Error) => void): void {

  var dataArr: string[] = [];
  const req = https.get(
    <any>{
      host: host,
      path: path,
      protocol: "https:",
      port: 443,
      method: "GET",
      headers: headers
    },
    function(resp: IncomingMessage) {
      resp.setEncoding("utf-8");
      resp.on("data", function(data) {
        dataArr.push(data);
      });
      resp.on("end", function() {
        if (successCallback) {
          successCallback(dataArr.join(""));
        }
      });
    });
  req.on('error', function(e) {
    if (failCallback) {
      console.log(e);
      failCallback(e);
    }
  });
}

export function deleteData(
  host: string,
  path: string,
  headers: { [key: string]: any },
  successCallback?: (incomingData: string) => void,
  failCallback?: (e: Error) => void): void {

  var dataArr: string[] = [];
  const req = https.request(
    <any>{
      host: host,
      path: path,
      protocol: "https:",
      port: 443,
      method: "DELETE",
      headers: headers
    },
    function(resp: IncomingMessage) {
      resp.setEncoding("utf-8");
      resp.on("data", function(data) {
        dataArr.push(data);
      });
      resp.on("end", function() {
        if (successCallback) {
          successCallback(dataArr.join(""));
        }
      });
    });
  req.on('error', function(e) {
    if (failCallback) {
      console.log(e);
      failCallback(e);
    }
  });
}

export function validateAndRedirectUrl(validRedirectDomainLookup: { [key: string]: boolean },
  session: Express.Session,
  res: Response,
  url?: string): void {

  if (url) {
    try {
      let origin = new URL(url).hostname;
      if (validRedirectDomainLookup[origin]) {
        res.redirect(url);
      }
    } catch (e) {
      res.status(400).end();
    }
  } else {
    res.redirect(session.redirectUrl);
  }
}
