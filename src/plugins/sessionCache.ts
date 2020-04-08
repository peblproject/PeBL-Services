import { SessionDataManager } from '../interfaces/sessionDataManager';
import { RedisClient } from 'redis';

export class RedisSessionDataCache implements SessionDataManager {
  private redis: RedisClient;

  constructor(redisClient: RedisClient) {
    this.redis = redisClient;
  }

  setHashValues(key: string, values: string[]): void {
    this.redis.hmset(key, values);
  }

  getHashValues(key: string, callback: (data: string[]) => void): void {
    this.redis.hvals(key, (err, result) => {
      if (err) {
        console.log(err);
        callback([]);
      } else {
        callback(result);
      }
    });
  }

  deleteHashValue(key: string, field: string, callback: (deleted: boolean) => void): void {
    this.redis.hdel(key, field, (err, result) => {
      if (err) {
        console.log(err);
        callback(false);
      } else {
        callback(true);
      }
    });
  }

  queueForLrs(value: string): void {
    this.redis.rpush('outgoingXapi', value);
  }

  retrieveForLrs(count: number, callback: ((value?: string[]) => void)): void {
    let transaction = this.redis.multi();
    transaction.lrange('outgoingXapi', 0, count, (err, resp) => {
      if (err) {
        console.log(err);
        callback(undefined);
      } else {
        callback(resp);
      }
    });
    transaction.ltrim('outgoingXapi', count + 1, -1);
    transaction.exec();
  }
}
