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

	rekognition.indexFaces(params, function(err, data) {
		if (err){ 
			return res.status(200).json({status:'error', err: err.stack});
		}else{
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


module.exports = router;
