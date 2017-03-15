'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const s3 = new AWS.S3();

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const params = {
	TableName: process.env.DYNAMODB_TABLE,
};

let counter = 0;

module.exports.tos3 = (event, context, callback) => {
	scanExecute(callback);
};
var sendResponse = (err, items, callback) => {
	// create a response
	const response = {
		statusCode: 200,
		body: {
			message: "${counter} object has been updated",
		},
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

		result.Items.map((item) => {
			if (item.data.hardwareInfo) {
				saveJsonToS3(item);
			}
		});

		if (result.LastEvaluatedKey) {
			params.ExclusiveStartKey = result.LastEvaluatedKey;
			scanExecute(callback);
		} else {
			sendResponse(error, items, callback);
		}
	});
};

function saveJsonToS3(item) {
	// save file to s3
	const s3Data = {
		Bucket: process.env.BUCKET,
		Key: item.serial + '-' + item.id,
		Body: JSON.stringify(item.data),
	};

	s3.putObject(s3Data, (err, ret) => {
		if (err) {
			console.error(err);
			return;
		}
		// Only save readable data to dynamoDb
		const data = item.data;
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
			Key: {
				"id": item.id,
			},
			UpdateExpression: "set #data = :d",
			ExpressionAttributeNames: {
				"#data": "data",
			},
			ExpressionAttributeValues: {
				":d": dynData,
			},
			ReturnValues: "UPDATED_NEW",
		}



		// write the todo to the database
		dynamoDb.update(params, (error, result) => {
			// handle potential errors
			if (error) {
				console.error(error);
				return;
			}
			counter++;
			console.log("----", item.id, "---updated");
		});

	});
}