'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

module.exports.create = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);

  // Only save readable data to dynamoDb
  const dynData = {
    jvmMemInfo: data.jvmMemInfo,
    freeInfo: {
      total: data.freeInfo.total,
      used: data.freeInfo.used,
      free: data.freeInfo.free,
    },
    topInfo: data.topInfo.processes.slice(0, 2),
    systemTime: data.systemTime,
  };

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: uuid.v1(),
      serial: data.serial,
      data: dynData,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    ReturnValues: 'ALL_OLD',
  };

  // save file to s3
  const s3Data = {
    Bucket: process.env.BUCKET,
    Key: data.serial + '-' + params.Item.id,
    Body: event.body,
  };

  s3.putObject(s3Data, (err, ret) => {
    if (err) {
      console.error(err);
    }
  });

  // write the todo to the database
  dynamoDb.put(params, (error, result) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(new Error('Couldn\'t create the todo item.'));
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(params.Item),
    };
    callback(null, response);
  });
};