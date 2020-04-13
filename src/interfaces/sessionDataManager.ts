export interface SessionDataManager {

  setHashValues(key: string, values: string[]): void;
  getHashValues(key: string, callback: ((data: string[]) => void)): void;
  getHashValue(key: string, field: string, callback: ((data?: string) => void)): void;
  deleteHashValue(key: string, field: string, callback: ((deleted: boolean) => void)): void;

  queueForLrs(value: string): void;
  queueForLrsVoid(value: string): void;
  retrieveForLrs(count: number, callback: ((value?: string[]) => void)): void;

  broadcast(channel: string, message: string): void;
}
