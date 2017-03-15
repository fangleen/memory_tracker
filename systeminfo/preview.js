'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const params = {
  TableName: process.env.DYNAMODB_TABLE,
  ProjectionExpression: "createdAt, id, serial, #data.jvmMemInfo, #data.freeInfo.#total," +
    "#data.freeInfo.used, #data.freeInfo.#free, #data.systemTime, #data.topInfo",
  ExpressionAttributeNames: {
    "#data": "data",
    "#total": "total",
    "#free": "free",
  },
};

module.exports.preview = (event, context, callback) => {
  scanExecute(callback);
};

var sendResponse = (err, items, callback) => {
  // create a response
  const response = {
    statusCode: 200,
    body: JSON.stringify(items.map(record => {
      return {
        createdAt: record.createdAt,
        id: record.id,
        serial: record.serial,
        data: {
          jvmMemInfo: {
            freeMem: record.data.jvmMemInfo.freeMem,
            inUseMem: record.data.jvmMemInfo.inUseMem,
            coreNum: record.data.jvmMemInfo.coreNum,
            maxMem: record.data.jvmMemInfo.maxMem,
          },
          freeInfo: {
            total: record.data.freeInfo.total,
            used: record.data.freeInfo.used,
            free: record.data.freeInfo.free,
          },
          topInfo: record.data.topInfo,
          systemTime: record.data.systemTime,
        }
      }
    })),
  };
  callback(null, response);
};

var items = [];
var scanExecute = (callback) => {
  dynamoDb.scan(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(new Error('Couldn\'t fetch the todos.'));
      return;
    }

    items = items.concat(result.Items);
    if (result.LastEvaluatedKey) {
      params.ExclusiveStartKey = result.LastEvaluatedKey;
      scanExecute(callback);
    } else {
      sendResponse(error, items, callback);
    }
  });
};