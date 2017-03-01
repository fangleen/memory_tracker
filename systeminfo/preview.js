'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const params = {
  TableName: process.env.DYNAMODB_TABLE,
};

module.exports.preview = (event, context, callback) => {
  // fetch all todos from the database
  dynamoDb.scan(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(new Error('Couldn\'t fetch the todos.'));
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(result.Items.map(record => {
        return {
          createdAt: record.createdAt,
          id: record.id,
          serial: record.serial,
          data: {
            jvmMemInfo: {
              freeMem: record.data.jvmMemInfo.freeMem,
              inUseMem: record.data.jvmMemInfo.inUseMem,
              coreNum: record.data.jvmMemInfo.coreNum,
              maxMem: record.data.jvmMemInfo.maxMem
            },
            freeInfo: {
              total: record.data.freeInfo.total,
              used: record.data.freeInfo.used,
              free: record.data.freeInfo.free
            },
            topInfo: {
              processes: record.data.topInfo.processes
            },
            systemTime: record.data.systemTime
          }
        }
      })),
    };
    callback(null, response);
  });
};
