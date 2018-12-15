var AWS = require('aws-sdk');
global.fetch = require('isomorphic-fetch');
global.navigator = { };
const cognito = require ('amazon-cognito-identity-js');
const config = require('../config.json');

var express = require('express');
var router = express.Router();

const rekognition = new AWS.Rekognition(config.rekognition)

router.post('/collection/create', (req,res)=>{
	var params = {
		CollectionId: req.body.CollectionId
	};

	rekognition.createCollection(params, function(err, data) {
		if (err){ 
			return res.status(200).json({status:'error', err: err.stack});
		}else{
			return res.status(200).json({status:'success', data:data});
		}
	});

});

router.post('/collection/delete', (req,res)=>{
	var params = {
		CollectionId: req.body.CollectionId
	};

	rekognition.deleteCollection(params, function(err, data) {
		if (err){ 
			return res.status(200).json({status:'error', err: err.stack});
		}else{
			return res.status(200).json({status:'success', data:data});
		}

	});

});

router.post('/collection/listFaces', (req,res)=>{
	var params = {
	  CollectionId: req.body.CollectionId, 
	  MaxResults: 20
	 };

	rekognition.listFaces(params, function(err, data) {
		if (err){ 
			return res.status(200).json({status:'error', err: err.stack});
		}else{
			return res.status(200).json({status:'success', data:data});
		}

	});

});

router.post('/collection/indexFaces', (req,res)=>{
	var params = {
		CollectionId: req.body.CollectionId, 
		DetectionAttributes: [ "DEFAULT" ], 
		//ExternalImageId: "myphotoid", 
		Image: {
			S3Object: {
				Bucket: "rekimagesmarius", 
				Name: req.body.image
			}
		}
	};

	let name = req.body.name || "unk";

	rekognition.indexFaces(params, function(err, data) {
		if (err){ 
			return res.status(200).json({status:'error', err: err.stack});
		}else{
			var dyndata = {
			    "id": { S: data.FaceRecords[0].Face.FaceId },
			    "name":{ "S" : name }
			  }
			dynsave(dyndata);

			return res.status(200).json({status:'success', data:data});
		}

	});

});

router.post('/collection/searchImage', (req,res)=>{
	var params = {
		CollectionId: req.body.CollectionId, 
		FaceMatchThreshold: 90, 
		Image: {
				S3Object: {
				Bucket: "rekimagesmarius", 
				Name: req.body.image
			}
		}, 
		MaxFaces: 5
	};

	rekognition.searchFacesByImage(params, function(err, data) {
		if (err){ 
			return res.status(200).json({status:'error', err: err.stack});
		}else{
			var dyndata= {
			    "id": { S: data.FaceMatches[0].Face.FaceId }
			};
			dynget(dyndata);
			return res.status(200).json({status:'success', data:data});
		}

	});

});

router.post('/collection/searchImage', (req,res)=>{
	var params = {
		CollectionId: req.body.CollectionId, 
		FaceMatchThreshold: 90, 
		Image: {
				S3Object: {
				Bucket: "rekimagesmarius", 
				Name: req.body.image
			}
		}, 
		MaxFaces: 5
	};

	rekognition.searchFacesByImage(params, function(err, data) {
		if (err){ 
			return res.status(200).json({status:'error', err: err.stack});
		}else{
			return res.status(200).json({status:'success', data:data});
		}

	});

});

router.post('/collection/detectFaces', (req,res)=>{
	var params = {
		Image: {
			S3Object: {
			Bucket: "rekimagesmarius", 
			Name: req.body.image
			}
		}
		/*,Attributes: ["ALL"]*/
	};

	rekognition.detectFaces(params, function(err, data) {
		if (err){ 
			return res.status(200).json({status:'error', err: err.stack});
		}else{
			return res.status(200).json({status:'success', data:data});
		}

	});

});


/*
//s3 test code
var s3 = new AWS.S3(config.S3);

//console.log(s3.listAlbums);

s3.listObjects({Delimiter: '/'}, function(err, data) {
        console.log(data);

});
*/





var dyndb = new AWS.DynamoDB(config.dyndb);
function dynsave(data){
	params = {
	  TableName: 'faces', 
	  Item: data
	  /* Item: {
	    "id": { S: "0" },
	    "name":{ "S" : "marius" },
	    "faces":{ "S" : "00-00-11-00" }
	  } */
	};

	// Call DynamoDB to add the item to the table
	dyndb.putItem(params, function(err, data) {
	  if (err) {
	    console.log("Error", err);
	  } else {
		console.log("Success", data);
	  }
	});	
}

function dynget(data){
	params = {
	  TableName: 'faces', 
	  Key: data 
	  /*{
	    "id": { S: "02bedb93-15d1-4e2e-8523-4dd9045f2434" }
		}
		*/
	};

	// Call DynamoDB to add the item to the table
	dyndb.getItem(params, function(err, data) {
	  if (err) {
	    console.log("Error", err);
	  } else {
		console.log(data);
	  }
	});	
}






module.exports = router;
