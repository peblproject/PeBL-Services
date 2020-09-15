import { XApiStatement, ActivityObject } from "./xapiStatement";
import { PREFIX_PEBL_EXTENSION, PREFIX_PEBL, PREFIX_PEBL_THREAD } from "../utils/constants";

export class Session extends XApiStatement {

  readonly activityId: string;
  readonly book: string;
  readonly activityName?: string;
  readonly activityDescription?: string;

  readonly type: string;

  readonly currentTeam?: string;
  readonly currentClass?: string;

  constructor(raw: { [key: string]: any }) {
    super(raw);

    let object = this.object as ActivityObject;

    this.book = object.id;
    if (this.book.indexOf(PREFIX_PEBL) != -1)
      this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL) + PREFIX_PEBL.length);
    else if (this.book.indexOf(PREFIX_PEBL_THREAD) != -1)
      this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL_THREAD) + PREFIX_PEBL_THREAD.length);


    this.activityId = object.id;
    if (object.definition) {
      this.activityName = object.definition.name && object.definition.name["en-US"];
      this.activityDescription = object.definition.description && object.definition.description["en-US"];

      let extensions = object.definition.extensions;
      if (extensions) {
        if (extensions[PREFIX_PEBL_EXTENSION + "bookId"])
          this.book = extensions[PREFIX_PEBL_EXTENSION + "bookId"];

        this.currentTeam = extensions[PREFIX_PEBL_EXTENSION + "currentTeam"];
        this.currentClass = extensions[PREFIX_PEBL_EXTENSION + "currentClass"];
      }
    }

    this.type = this.verb.display["en-US"];
  }

  static is(x: XApiStatement): boolean {
    if (!XApiStatement.is(x))
      return false;

    let verb = x.verb.display["en-US"];
    return (verb == "entered") || (verb == "exited") || (verb == "logged-in") ||
      (verb == "logged-out") || (verb == "terminated") || (verb == "initialized") || (verb == "launched");
  }

  static isLogin(x: any): boolean {
    let verb = x.verb.display["en-US"];

    if (verb === 'logged-in')
      return true;

    return false;
  }
}
