import { open } from "lmdb";
import cron from "node-cron";
import { timeOffline } from "./constant.js";
import path from "node:path";
import fs from "fs";

/**
 * @type {import("lmdb").Database<any, string>}
 */
const DB = open("history", {
  // any options go here, we can turn on compression like this:
  compression: true,
});

export const Service = {
  /**
   *
   * @param {string} ipAddress
   * @returns {Promise<number[]>}
   */
  getRequestHistory: async (ipAddress) => {
    const dbKey = `rate_limit:${ipAddress}`;
    const data = /** @type {{requests: number[]}} */ (
      (await DB.get(dbKey)) || { requests: [] }
    );
    return data.requests;
  },

  /**
   *
   * @param {string} ipAddress
   * @param {number} timestamp
   */
  updateRequestHistory: async (ipAddress, timestamp) => {
    const dbKey = `rate_limit:${ipAddress}`;
    const existingData = /** @type {{requests: number[]}} */ (
      (await DB.get(dbKey)) || { requests: [] }
    );
    existingData.requests.push(timestamp);
    await DB.put(dbKey, existingData);
  },

  /**
   * 
   * @param {string} folderID 
   * @param {{
   *  link: string,
   *  folderName: string,
   *  ipAddress: string,
   *  timestamp: number
   * }} data 
   */
  setFolderData: async (folderID, data) => {
    await DB.put("folders:" + folderID, data);
  },

  /**
   * 
   * @param {string} folderID 
   * @returns {Promise<{
   *  link: string,
   *  folderName: string,
   *  ipAddress: string,
   *  timestamp: number
   * } | undefined>}
   */
  getFolderData: async (folderID) => {
    return await DB.get("folders:" + folderID);
  }
};


// Periodic cleanup task to remove old rate limit entries and folder data
// Runs every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  const now = Date.now();
  const rateLimitKeys = await DB.getKeys().filter(key => key.startsWith('rate_limit:'));
  for (const key of rateLimitKeys) {
    const data = /** @type {{requests: number[]}} */ (await DB.get(key));
    if (data) {
      const filteredRequests = data.requests.filter(timestamp => now - timestamp < 15 * 60 * 1000); // 15 minutes
      if (filteredRequests.length > 0) {
        await DB.put(key, { requests: filteredRequests });
      } else {
        await DB.remove(key);
      }
    }
  }

  const folderKeys = await DB.getKeys().filter(key => key.startsWith('folders:'));
  for (const key of folderKeys) {
    const folderData = await Service.getFolderData(key.split(':')[1]);
    if (folderData && (now - folderData.timestamp > timeOffline)) {
      console.log(`Cleaning up folder data for key: ${key}`);
      // delete old folder data
      const pathToDelete = path.join(".cache", folderData.folderName);
      await fs.promises.rm(pathToDelete, { recursive: true, force: true });
      await DB.remove(key);
    }
  }
});