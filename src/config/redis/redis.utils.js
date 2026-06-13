import redis from './index.js';

// Set a key-value pair with an optional expiration time
export const setKey = async (key, value, expiryInSeconds = null) => {
  try {
    if (expiryInSeconds) {
      await redis.set(key, value, 'EX', expiryInSeconds);
    } else {
      await redis.set(key, value);
    }
    console.log(`✅ Key set: ${key}`);
  } catch (error) {
    console.error(`❌ Error setting key ${key}:`, error.message);
  }
};

// Get a value by key
export const getKey = async (key) => {
  try {
    const value = await redis.get(key);
    console.log(`✅ Key retrieved: ${key}`);
    return value;
  } catch (error) {
    console.error(`❌ Error retrieving key ${key}:`, error.message);
    return null;
  }
};

// Delete a key
export const deleteKey = async (key) => {
  try {
    await redis.del(key);
    console.log(`✅ Key deleted: ${key}`);
  } catch (error) {
    console.error(`❌ Error deleting key ${key}:`, error.message);
  }
};

export const incrementKey = async (key) => {
  try {
    return await redis.incr(key); // returns new value after increment
  } catch (error) {
    console.error(`❌ Error incrementing key ${key}:`, error.message);
    return null;
  }
};

export const setExpiry = async (key, expiryInSeconds) => {
  try {
    await redis.expire(key, expiryInSeconds);
  } catch (error) {
    console.error(`❌ Error setting expiry on key ${key}:`, error.message);
  }
};