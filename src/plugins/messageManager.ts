import { PeBLPlugin } from "../models/peblPlugin";
import { SessionDataManager } from "../interfaces/sessionDataManager";
import { Message } from "../models/message";
import { generateUserMessagesKey, generateMessagesKey } from "../utils/constants";
import { MessageManager } from "../interfaces/messageManager";
import { MessageTemplate } from "../models/messageTemplate";

export class DefaultMessageManager extends PeBLPlugin implements MessageManager {

  private sessionData: SessionDataManager;

  constructor(sessionData: SessionDataManager) {
    super();
    this.sessionData = sessionData;
    this.addMessageTemplate(new MessageTemplate("getMessages",
      this.validateGetMessages,
      (payload) => {
        this.getMessages(payload.identity, payload.callback);
      }));

    this.addMessageTemplate(new MessageTemplate("saveMessages",
      this.validateSaveMessages,
      (payload) => {
        this.saveMessages(payload.identity, payload.messages);
      }));

    this.addMessageTemplate(new MessageTemplate("deleteMessages",
      this.validateDeleteMessages,
      (payload) => {
        this.deleteMessage(payload.identity, payload.id);
      }));
  }

  validateGetMessages(payload: { [key: string]: any }): boolean {
    return false;
  }

  validateSaveMessages(payload: { [key: string]: any }): boolean {
    return false;
  }

  validateDeleteMessages(payload: { [key: string]: any }): boolean {
    return false;
  }


  getMessages(identity: string, callback: ((messages: Message[]) => void)): void {
    this.sessionData.getHashValues(generateUserMessagesKey(identity),
      (result: string[]) => {
        callback(result.map(function(x) {
          return new Message(JSON.parse(x));
        }))
      })
  }

  saveMessages(identity: string, messages: Message[]): void {
    let arr = [];
    for (let message of messages) {
      arr.push(generateMessagesKey(message.id));
      arr.push(JSON.stringify(message));
    }
    this.sessionData.setHashValues(generateUserMessagesKey(identity), arr);
  }

  deleteMessage(identity: string, id: string): void {
    this.sessionData.deleteHashValue(generateUserMessagesKey(identity),
      generateMessagesKey(id),
      (result: boolean) => {
        if (!result) {
          console.log("failed to delete message", id);
        }
      });
  }
}