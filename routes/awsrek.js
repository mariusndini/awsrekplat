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
			var promises = [];
			for(i=0; i < data.FaceMatches.length; i++){
				var dyndata= {
				    "id": { S: data.FaceMatches[i].Face.FaceId }
				};

				promises.push(dynget(dyndata))
			}

			Promise.all(promises)    
			.then(function(data){ 
				if(data.length == 0){
					return res.status(200).json({status:'success', data: data});
				}

				for(var item in data){
					if(data[item].Item){
						//console.log(data[item]);
						return res.status(200).json({status:'success', data: data[item]});

					}
				}

			})
			.catch(function(err){ 
				console.log({"err": "searchFacesByImage", e:errs});
			});

			//console.log(data);

		}

	});

});

/*
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
*/

router.post('/collection/detectFaces', (req,res)=>{
	var params = {
		Image: {
			S3Object: {
			Bucket: "rekimagesmarius", 
			Name: req.body.image
			}
		},
		Attributes: ["DEFAULT"]
	};

	detectFaces(req.body.image, (data)=>{
		return res.status(200).json(data); 
	});

/*
	rekognition.detectFaces(params, function(err, data) {
		if (err){ 
			return res.status(200).json({status:'error', err: err.stack});
		}else{
			return res.status(200).json({status:'success', data:data});
		}

	});
*/
});


function detectFaces(image, cb){
	var params = {
		Image: {
			S3Object: {
			Bucket: "rekimagesmarius", 
			Name: image
			}
		},
		Attributes: ["DEFAULT"]
	};

	rekognition.detectFaces(params, function(err, data) {
		if (err){ 
			return cb({status:'error', err: err.stack});
		}else{
			return cb({status:'success', data:data});
		}

	});

}

/*
detectFaces('tet.jpg',(d)=>{
	console.log(d); 

});
*/


//s3 test code
var s3 = new AWS.S3(config.S3);

var request = require('request');

var download = function(uri, filename, callback){
 var options = {
        uri: uri,
        encoding: null
    };
    request(options, function(error, response, body) {
        if (error || response.statusCode !== 200) { 
            console.log("failed to get image");
            console.log(error);
        } else {
            s3.putObject({
                Body: body,
                Key: filename,
                Bucket: config.S3.Bucket

            }, function(error, data) { 
                if (error) {
                    console.log("error downloading image to s3");
                } else {
                    console.log("success uploading to s3");
                    callback();
                }
            }); 
        }   
    });



};


router.post('/bucket/saveObject', (req,res)=>{
	var link = req.body.link;
	var name = req.body.name;

	download(link, name, function(){
		return res.status(200).json({status:'success', data: 'Object Uploaded'});
	});


});





router.get('/bucket/listObjects', (req,res)=>{
	s3.listObjects({Bucket: config.S3.Bucket, Delimiter: '/'}, function(err, data) {
		return res.status(200).json({status:'success', data: data});
	});


});




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


	return new Promise(resolve => {dyndb.getItem(params, function(err, data) {
		  if (err) {
		    console.log("Error", err);
		  } else {
		  	resolve(data);
		  }
		})

	});

}//end dyn get


var allFaceData = {
    "status": "success",
    "data": {
        "FaceDetails": [
            {
                "BoundingBox": {
                    "Width": 0.1563405692577362,
                    "Height": 0.1518653780221939,
                    "Left": 0.31902414560317993,
                    "Top": 0.1681743562221527
                },
                "Landmarks": [
                    {
                        "Type": "eyeLeft",
                        "X": 0.382906436920166,
                        "Y": 0.2244488000869751
                    },
                    {
                        "Type": "eyeRight",
                        "X": 0.44367897510528564,
                        "Y": 0.22503553330898285
                    },
                    {
                        "Type": "mouthLeft",
                        "X": 0.398097962141037,
                        "Y": 0.27416107058525085
                    },
                    {
                        "Type": "mouthRight",
                        "X": 0.447722464799881,
                        "Y": 0.2746689021587372
                    },
                    {
                        "Type": "nose",
                        "X": 0.43794775009155273,
                        "Y": 0.2428121417760849
                    }
                ],
                "Pose": {
                    "Roll": 1.3068028688430786,
                    "Yaw": 14.021855354309082,
                    "Pitch": 24.210594177246094
                },
                "Quality": {
                    "Brightness": 80.22309112548828,
                    "Sharpness": 67.22731018066406
                },
                "Confidence": 100
            },
            {
                "BoundingBox": {
                    "Width": 0.15658625960350037,
                    "Height": 0.14998100697994232,
                    "Left": 0.4697798788547516,
                    "Top": 0.25029563903808594
                },
                "Landmarks": [
                    {
                        "Type": "eyeLeft",
                        "X": 0.49220114946365356,
                        "Y": 0.31761133670806885
                    },
                    {
                        "Type": "eyeRight",
                        "X": 0.5564708113670349,
                        "Y": 0.30023306608200073
                    },
                    {
                        "Type": "mouthLeft",
                        "X": 0.523472011089325,
                        "Y": 0.3653060793876648
                    },
                    {
                        "Type": "mouthRight",
                        "X": 0.5764919519424438,
                        "Y": 0.35095569491386414
                    },
                    {
                        "Type": "nose",
                        "X": 0.5295129418373108,
                        "Y": 0.3331208825111389
                    }
                ],
                "Pose": {
                    "Roll": -21.62548065185547,
                    "Yaw": -2.570434808731079,
                    "Pitch": 7.624760150909424
                },
                "Quality": {
                    "Brightness": 56.85871887207031,
                    "Sharpness": 86.86019134521484
                },
                "Confidence": 99.99998474121094
            }
        ]
    }
};


var jimp = require('jimp');

s3.getObject({ Bucket: config.S3.Bucket, Key: "mo.jpg" },
	function (error, data) {
		if (error != null) {
			console.log("Failed to retrieve an object: " + error);
		} else {

			var img = new jimp(data.Body, (err, image)=>{
				var w = image.bitmap.width; 
    			var h = image.bitmap.height;
				
    			var faces = allFaceData.data.FaceDetails;
    			var clone; //

    			var promises = []
    			for( i=0; i < faces.length; i++ ){
    				clone = image.clone().crop(w*faces[i].BoundingBox.Left, h*faces[i].BoundingBox.Top, w*faces[i].BoundingBox.Width, h*faces[i].BoundingBox.Height);
					promises.push(clone.getBuffer(jimp.MIME_JPEG, (err, data)=>{
						var callback = function(error, data) { 
			                if (error) {
			                    console.log({'status':'error', err:error});
			                } else {
			                    console.log({'status':'success', data:data});
			                }
			            };

						s3.putObject({ Body: data, Key: 'faces/f'+i+'.' + '_img.jpg', Bucket: config.S3.Bucket}, callback);

					}));//end adding promises

    			}//end for loop

    			Promise.all(promises)    
				.then(function(data){ 
					console.log('done');

				})
				.catch(function(err){ 
					console.log({"status": "error", e:err});
				});



/*
				var clone = image.clone().crop(w*faces[0].BoundingBox.Left, h*faces[0].BoundingBox.Top, w*faces[0].BoundingBox.Width, h*faces[0].BoundingBox.Height);
				clone.getBuffer(jimp.MIME_JPEG, (error, result)=>{
					s3.putObject({
		                Body: result,
		                Key: ('f0.' + data.ETag) + '.jpg',
		                Bucket: config.S3.Bucket

			            }, function(error, data) { 
			                if (error) {
			                    console.log("error uploading image to s3");
			                } else {
			                    console.log("success uploading to s3");

								clone = image.clone().crop(w*faces[1].BoundingBox.Left, h*faces[1].BoundingBox.Top, w*faces[1].BoundingBox.Width, h*faces[1].BoundingBox.Height);
								clone.getBuffer(jimp.MIME_JPEG, (error, result)=>{
									s3.putObject({
						                Body: result,
						                Key: ('f1.' + data.ETag) + '.jpg',
						                Bucket: config.S3.Bucket

							            }, function(error, data) { 
							                if (error) {
							                    console.log("error uploading image to s3");
							                } else {
							                    console.log("success uploading to s3- 1");
							                }
							            }); 
								})//end inner clone
			                }//end error if


			            }); //end function


				})//end put object
*/
			});

		}
	}
);














module.exports = router;
