var express = require('express');
var router = express.Router();
var mysql = require('mysql') ;
var co = require('co');
var OSS = require('ali-oss');
var fs = require('fs');


var multer  = require('multer');

var client = new OSS({
  region: 'oss-cn-shanghai',
  accessKeyId: 'LTAI4NpbadMsra0X',
  accessKeySecret: 'tqizcANMSTyDEn70QrUOHoy5b5CNSq',
  bucket: 'wild',
  object: 'images',
});

var storge = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        var fileformat = (file.originalname).split('.');
        cb(null, file.fieldname+'-'+Date.now()+'.'+fileformat[fileformat.length-1]);
    }
})
var upload = multer({storage: storge});


 // 数据库链接参数设置
 var connection = mysql.createConnection({
   host : 'rm-uf61jkshc9u8xx987o.mysql.rds.aliyuncs.com',
   user : 'admin' ,
   password : '898011234',
   database: 'snail'
 });

connection.connect();



// 公共函数列表
var commonFun = {
	// 用户权限验证
	hasAuthory: function(userId){
		var query = "SELECT * FROM `user` WHERE `user_id` = " + userId;
		var authory = {
			req : "",
			data: ""
		};
		console.log("开始权限判断");
		connection.query(query,"",function(err,req){
			console.log(req[0].user_id);
			if (err) {
				authory.req =  false;
				return authory;
			}else 
			if (req[0].user_id == userId) {
				authory.req =  true;
				authory.data = req[0];
				return authory;
			}
		});
		
	},
}



// 登陆
router.post("/login",function(req,res){
	var account = req.body.account;
	var password = req.body.password;
	var query = "SELECT * FROM user WHERE account = '" + req.body.account + "' And password = " + req.body.password;
	var data = {
		error:"1",
		desc:"",
		data:""
	};
	connection.query(query,"",function(err,queryData){

		if (err) {
			console.log(err);
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
		}else if (queryData[0] == undefined) {
			data.error = 1;
			data.desc = "登录失败";
			data.data = "";
		}
		else {
			if (queryData[0].account == account && queryData[0].password == password) {
				data.error = 0;
				data.desc = "登录成功";
				data.data = {
					userId: queryData[0].user_id
				}
			};
		};
		res.json(data);
	});
});


// 文章编辑上传接口
router.post("/arcticleEdit",function(req,res){
	var userId = req.body.userId;//编辑者id，只要id验证通过才可以上传文章
	var title = req.body.title;//文章标题，必须
	var tips = req.body.tips;//文章简介，必须
	var content = req.body.content;//文章内容，富文本，必须
	var type = req.body.type;//文章类型,必须
	
	// 前端已进行非空验证--跳过
	// 验证权限
	var query = "SELECT * FROM `user` WHERE `user_id` = " + userId;
	console.log("id为" + userId + "的编辑者正在为编辑文章进行权限验证");

	var data = {
		error:"1",
		desc:"",
		data:""
	};

	connection.query(query,"",function(err,queryData){
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
			console.log("验证失败，系统异常");
			res.json(data);
		}else
		if (queryData[0].user_id == userId) {
			console.log("验证通过，允许编辑文章");
			var insert = "INSERT INTO `arcticle`(`arcticle_title` , `arcticle_author` , `arcticle_content` , `arcticle_tips` , `user_id`, `arcticle_type`) VALUES('" + title + "','" + queryData[0].nick_name + "','" + content + "','" + tips + "','" + userId + "','" + type + "')";
			connection.query(insert,"",function(insertErr,insertData){
				if (insertData.affectedRows == 1) {
					data.error = "0";
					data.desc = "文章上传成功";
					data.data = "";
					console.log("文章上传成功");
					res.json(data);
				}
			});

		}else {
			data.error = "1";
			data.desc = "当前无编辑文章的权限";
			data.data = "";
			console.log("验证失败，没有权限");
			res.json(data);
		}

	});

});

// 文章修改接口
router.post("/updateArcticle",function(req,res){
	var userId = req.body.userId;//编辑者id，只要id验证通过才可以上传文章
	var arcticleId = req.body.arcticleId;
	var title = req.body.title;
	var tips = req.body.tips;
	var content = req.body.content;
	var type = req.body.type;

	var query = "SELECT * FROM `user` WHERE `user_id` = " + userId;
	console.log("id为" + userId + "的编辑者正在为修改文章进行权限验证");
	var data = {
		error:"1",
		desc:"",
		data:""
	};
	connection.query(query,"",function(err,queryData){
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
			console.log("验证失败，系统异常");
			res.json(data);
		}else
		if (queryData[0].user_id == userId) {
			console.log("验证通过，允许修改文章");
			var update = "UPDATE `arcticle` SET `arcticle_title` = '" + title + "',`arcticle_tips` = '" + tips + "',`arcticle_content` = '" + content + "',`arcticle_type` = '" + type + "' WHERE `arcticle_id` = " + arcticleId + " AND `user_id` = " + userId;
			connection.query(update,"",function(updatetErr,updateData){
				if (updatetErr) {
					data.error = "1";
					data.desc = "操作失败";
					data.data = updatetErr;
					console.log("文章修改失败");
					res.json(data);
				}else {
					data.error = "0";
					data.desc = "文章修改成功";
					data.data = "";
					console.log("文章修改成功");
					res.json(data);
				}
			});

		}else {
			data.error = "1";
			data.desc = "当前无编辑文章的权限";
			data.data = "";
			console.log("验证失败，没有权限");
			res.json(data);
		}

	});

});


// 文章删除接口
router.post("/deleteArcticle",function(req,res){
	var userId = req.body.userId;
	var arcticleId = req.body.arcticleId;
	// 验证权限
	var query = "SELECT * FROM `user` WHERE `user_id` = " + userId;
	console.log("id为" + userId + "的用户正在为查询文章列表进行权限验证");
	var data = {
		error:"1",
		desc:"",
		data:""
	};
	connection.query(query,"",function(err,queryData){
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
			console.log("验证失败，系统异常");
			res.json(data);
		}else
		if (queryData[0].user_id == userId) {
			console.log("验证通过，执行删除操作");
			var myDelete = "DELETE FROM `arcticle` WHERE `arcticle_id` = " + arcticleId + " AND `user_id` = " + userId;
			connection.query(myDelete,"",function(deleteErr,deleteData){
				if (deleteErr) {
					data.error = "-1";
					data.desc = "系统异常";
					data.data = "";
					console.log("操作失败，系统异常");
					res.json(data);
				}else {
					data.error = "0";
					data.desc = "删除成功";
					data.data = "";
					console.log("删除成功");
					res.json(data);
				}
			});

		}else {
			data.error = "1";
			data.desc = "操作失败";
			data.data = "";
			console.log("验证失败，没有权限");
			res.json(data);
		}

	});


});

// 文章发布接口
router.post("/publishArcticle",function(req,res){
	var userId = req.body.userId;
	var arcticleId = req.body.arcticleId;

	var query = "SELECT * FROM `user` WHERE `user_id` = " + userId;

	// 权限判断
	connection.query(query,"",function(err,queryData){
		if (err) {
			console.log("验证失败，系统异常");
			res.json({
				error:"-1",
				desc:"系统异常",
				data:""
			});
		}else
		if (queryData[0].user_id == userId) {
			var action = "UPDATE `arcticle` SET `arcticle_pub` = 1 WHERE `arcticle_id` = " + arcticleId;
			connection.query(action,"",function(err2,actionData){
				if (err2) {
					res.json({
						error:"1",
						desc:"系统异常",
						data:""
					})
				}else {
					if (actionData.affectedRows == 1) {
						console.log("操作成功");
						res.json({
							error: 0,
							desc: "操作成功",
							data: ""
						});
					}
				}
			});

		}else {
			res.json({
				error: 1,
				desc: "操作失败",
				data: ""
			});
		}

	});
});


// 文章列表查询接口
router.post("/arcticleList",function(req,res){
	var userId = req.body.userId;
	// 验证权限
	var query = "SELECT * FROM `user` WHERE `user_id` = " + userId;
	console.log("id为" + userId + "的用户正在为查询文章列表进行权限验证");
	var data = {
		error:"1",
		desc:"",
		data:""
	};
	connection.query(query,"",function(err,queryData){
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
			console.log("验证失败，系统异常");
			res.json(data);
		}else
		if (queryData[0].user_id == userId) {
			console.log("验证通过，正在查询数据");
			var myQuery = "SELECT `arcticle_id`,`arcticle_title`,`arcticle_author`,`arcticle_pub`,`arcticle_type` FROM `arcticle` WHERE `user_id` = " + userId;
			connection.query(myQuery,"",function(insertErr,insertData){
				if (insertErr) {
					data.error = "-1";
					data.desc = "系统异常";
					data.data = "";
					console.log("查询失败，系统异常");
					res.json(data);
				}else {
					data.error = "0";
					data.desc = "查询成功";
					data.data = insertData;
					console.log("查询成功，结果已经下发");
					res.json(data);
				}
			});

		}else {
			data.error = "1";
			data.desc = "查询失败";
			data.data = "";
			console.log("验证失败，没有权限");
			res.json(data);
		}

	});


});

// 获取文章详情
router.post("/getArcticle",function(req,res){
	var userId = req.body.userId;
	var arcticleId = req.body.arcticleId;
	// 验证权限
	var query = "SELECT * FROM `user` WHERE `user_id` = " + userId;
	console.log("id为" + userId + "的用户正在为查询文章详情进行权限验证");
	var data = {
		error:"1",
		desc:"",
		data:""
	};
	connection.query(query,"",function(err,queryData){
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
			console.log("验证失败，系统异常");
			res.json(data);
		}else
		if (queryData[0].user_id == userId) {
			console.log("验证通过，正在查询数据");
			var myQuery = "SELECT * FROM `arcticle` WHERE `arcticle_id` = " + arcticleId;



			connection.query(myQuery,"",function(insertErr,insertData){
				if (insertErr) {
					data.error = "-1";
					data.desc = "系统异常";
					data.data = "";
					console.log("查询失败，系统异常");
					res.json(data);
				}else {
					data.error = "0";
					data.desc = "查询成功";
					data.data = insertData[0];
					console.log("查询成功，结果已经下发");
					res.json(data);
				}
			});

		}else {
			data.error = "1";
			data.desc = "查询失败";
			data.data = "";
			console.log("验证失败，没有权限");
			res.json(data);
		}

	});
});

// 后台管理————我的作品接口————————————
router.post("/uploadWorks",function(req,res){
	var userId = req.body.userId;
	var title = req.body.title;
	var platform = req.body.platform;
	var skill = req.body.skill;
	var onLine = req.body.onLine;
	var imgList = req.body.imgList;
	var intros = req.body.intros;
	var head = req.body.head;
	var type = req.body.type;

	var insert = "INSERT INTO `works`(`user_id` , `works_title` , `works_platform` , `works_skill` , `works_img` , `works_intros` , `works_onLine` , `works_head` , `works_type` ) VALUES(" + userId + ",'" + title + "','" + platform + "','" + skill + "','" + imgList + "','" + intros + "'," + onLine + ",'" + head + "'," + type + ")";

	connection.query(insert,"",function(err,insertRes){
		if (err) {
			console.log(insert);
			res.json({
				error: "1",
				desc:"系统异常",
				data:""
			});
		}else {
			if (insertRes.affectedRows == 1) {
				res.json({
					error: "0",
					desc:"上传成功",
					data:""
				});
			}else {
				res.json({
					error: "1",
					desc:"上传失败",
					data:""
				});
			}
		}
	});

});







// -----------------------博客页面接口-----------------------
// 获取文章列表
router.post("/web/arcticleList",function(req,res){
	var arcticleType = req.body.arcticleType;

	console.log("博客页面正在请求文章数据");
	var data = {
		error:"1",
		desc:"",
		data:""
	};

	var query = "SELECT * FROM `arcticle` WHERE `arcticle_type` = " + arcticleType + " AND `arcticle_pub` = 1";
	console.log(query);

	connection.query(query,"",function(err,myData){
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
			console.log("查询失败，系统异常");
			res.json(data);
		}else {
			myData.find(function(value,index){

				value.arcticle_time = JSON.stringify(value.arcticle_time).substring(1,11);
			})

			data.error = "0";
			data.desc = "查询成功";
			data.data = myData;
			console.log("查询成功，结果已经下发");
			res.json(data);
		}
	});

});
// 获取文章详情
router.post("/web/arcticleDetail",function(req,res){
	var arcticleId = req.body.arcticleId;

	console.log("博客页面正在请求文章详情");
	var data = {
		error:"1",
		desc:"",
		data:""
	};
	// 查询语句
	var query = "SELECT * FROM `arcticle` WHERE `arcticle_id` = " + arcticleId;
	// 浏览数增加
	var update = "UPDATE `arcticle` SET `arcticle_read` = `arcticle_read` +1 WHERE `arcticle_id` = " + arcticleId;

	connection.query(update,"",function(errcode,updateData){
		if (errcode) {
			console.log("浏览量增加失败");
		}else {
			console.log("浏览量增加成功");
		}
	});


	connection.query(query,"",function(err,myData){
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
			console.log("查询失败，系统异常");
			res.json(data);
		}else {
			myData.find(function(value,index){
				
				value.arcticle_time = JSON.stringify(value.arcticle_time).substring(1,11);
			})

			data.error = "0";
			data.desc = "查询成功";
			data.data = myData[0];
			console.log("查询成功，结果已经下发");
			res.json(data);
		}
	});

});

// 文章点赞接口
router.post("/web/isLike",function(req,res){
	var arcticleId = req.body.arcticleId;
	// 查询语句
	var update = "UPDATE `arcticle` SET `arcticle_zan` = `arcticle_zan` +1 WHERE `arcticle_id` = " + arcticleId;

	connection.query(update,"",function(errcode,updateData){
		if (errcode) {
			console.log("浏览量增加失败");
			res.json({
				error:1,
				desc:"操作失败",
				data:""
			});
		}else {
			res.json({
				error:0,
				desc:"点赞成功",
				data:""
			});
		}
	});

});

// 博客页面——我的作品列表
router.post("/web/worksList",function(req,res){
	var arcticleType = req.body.arcticleType;

	console.log("博客页面正在请求作品数据");
	var data = {
		error:"1",
		desc:"",
		data:""
	};

	var query = "SELECT * FROM `works` WHERE `works_pub` = 0";
	console.log(query);

	connection.query(query,"",function(err,myData){
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
			console.log("查询失败，系统异常");
			res.json(data);
		}else {

			data.error = "0";
			data.desc = "查询成功";
			data.data = myData;
			console.log("查询成功，结果已经下发");
			res.json(data);
		}
	});

});

// 博客页面——获取我的作品详情
router.post("/web/worksDetail",function(req,res){
	var worksId = req.body.worksId;

	console.log("博客页面正在请求作品详情");
	var data = {
		error:"1",
		desc:"",
		data:""
	};
	// 查询语句
	var query = "SELECT * FROM `works` WHERE `works_id` = " + worksId;


	connection.query(query,"",function(err,myData){
		if (err) {
			data.error = "-1";
			data.desc = "系统异常";
			data.data = "";
			console.log("查询失败，系统异常");
			res.json(data);
		}else {
			data.error = "0";
			data.desc = "查询成功";
			data.data = myData[0];
			console.log("查询成功，结果已经下发");
			res.json(data);
		}
	});

});



module.exports = router;
