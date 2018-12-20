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




var jimp = require('jimp');

function dissectFaces(s3img){
	var st = new Date().getTime();

	s3.getObject({ Bucket: config.S3.Bucket, Key: s3img },
		function (error, data) {
			if (error != null) {
				console.log("Failed to retrieve an object: " + error);
			} else {


				function doJimp(allFaces){
					var img = new jimp(data.Body, (err, image)=>{
						var w = image.bitmap.width; 
		    			var h = image.bitmap.height;
						
		    			var faces = allFaces.data.FaceDetails;
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

					            var imgName = 'faces/f'+i+'.' + 'img.' + s3img + '.' + (new Date).getTime()+'.jpg';
								s3.putObject({ Body: data, Key: imgName, Bucket: config.S3.Bucket}, callback);
								
								//searchImage(imgName); //make this an async call

							}));//end adding promises

		    			}//end for loop

		    			Promise.all(promises)    
						.then(function(data){ 
							console.log('Loop--  ' + ((st - (new Date().getTime()))/1000 ));

						})
						.catch(function(err){ 
							console.log({"status": "error", e:err});
						});


					});


				}//end doJimp function

				detectFaces(s3img, (d)=>{ doJimp(d) });

			}
		}
	);

}
	


dissectFaces ('mo.jpg');

function searchImage(s3img){
	var params = {
		CollectionId: 'test', 
		FaceMatchThreshold: 90, 
		Image: {
				S3Object: {
				Bucket: "rekimagesmarius", 
				Name: s3img
			}
		}, 
		MaxFaces: 5
	};

	rekognition.searchFacesByImage(params, function(err, data) {
		if (err){ 
			return {status:'error', err: err.stack};
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
					return {status:'success', data: data};
				}

				for(var item in data){
					if(data[item].Item){
						console.log({status:'success', data: data[item]});

					}
				}

			})
			.catch(function(err){ 
				console.log({"err": "searchFacesByImage", e:errs});
			});

			//console.log(data);

		}

	});


}











module.exports = router;
