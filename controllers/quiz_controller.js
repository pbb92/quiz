var models = require('../models');
var Sequelize = require('sequelize');
var cloudinary = require('cloudinary');
var fs = require('fs');

// Opciones para imagenes subidas a Cloudinary
var cloudinary_image_options = { crop: 'limit', width: 200, height: 200, radius: 5, 
                                 border: "3px_solid_blue", tags: ['core', 'quiz-2016'] };


//Autoload el quiz asociado a :quizId

exports.load = function(req, res, next, quizId) {
	models.Quiz.findById(quizId, {include: [{model:models.Attachment}, {model:models.Comment, include:[{model:models.User, as:'Author'}]}]}) 
		.then(function(quiz) {
			if(quiz) {
				req.quiz = quiz;
				next();
			} else {
				next(new Error('No existe quizId=' + quizId));
			}
		}).catch(function(error) { next(error); });
};

// GET /quizzes
exports.index = function(req, res, next) {
	if(req.params.format === "json"){

		models.Quiz.findAll()
		.then(function(quizzes) {
			res.send(quizzes);
		})

	} else {
		var s = "%%";
	if(typeof req.query.search != 'undefined'){
		s = '%' + req.query.search.replace(' ', '%') + '%';
	}
	models.Quiz.findAll({ include: [ models.Attachment ] , where : {question: {$like: s }}})
	.then(function(quizzes){
		res.render('quizzes/index.ejs', { quizzes: quizzes});
	})
	.catch(function(error) { next(error); });
	}
};

// GET /quizzes/:id
exports.show = function(req, res, next) {
	if(req.params.format === "json"){

		models.Quiz.findAll()
		.then(function(quizzes) {
			res.send(quizzes[req.params.quizId-1]);
		})

	} else {
		var answer = req.query.answer || '';
		res.render('quizzes/show', {quiz: req.quiz,
								    answer: answer});
	}
};


// GET quizzes/:id/check
exports.check = function(req, res, next) {
		var answer = req.query.answer || "";
		var result = answer === req.quiz.answer ? 'Correcta' : 'Incorrecta';
		res.render('quizzes/result', { quiz:req.quiz, result:result, answer: answer });
};


//GET /quizzes/new
exports.new = function(req, res, next) {
	var quiz = models.Quiz.build({question: "", answer: ""});
	res.render('quizzes/new', {quiz: quiz});
};

// POST /quizzes/create
exports.create = function(req, res, next) {
	var authorId = req.session.user && req.session.user.id || 0;

	var quiz = models.Quiz.build({ question: req.body.quiz.question,
								   answer: 	req.body.quiz.answer,
								   AuthorId: authorId} );

    // Guarda en la tabla Quizzes el nuevo quiz.
    models.Quiz.create(quiz)
    .then(function(quiz) {
        req.flash('success', 'Pregunta y Respuesta guardadas con éxito.');

        if (!req.file) { 
            req.flash('info', 'Es un Quiz sin imagen.');
            return; 
        }    

         // Salvar la imagen en Cloudinary
        return uploadResourceToCloudinary(req)
        	.then(function(uploadResult) {
        		return createAttachment(req, uploadResult, quiz);
        	});
        })
    	.then(function() {
    		res.redirect('/quizzes');
    	})
		.catch(Sequelize.ValidationError, function(error) {

			req.flash('error', 'Errores en el formulario');
			for (var i in error.errors) {
				req.flash('error', error.errors[i].value);
			};
			res.render('quizzes/new', {quiz: quiz});
		})
		.catch(function(error) {
			req.flash('error', 'Error al crear un Quiz: '+error.message)
			next(error);
		});
};


// GET /quizzes/:id/edit
exports.edit = function(req, res, next) {
	var quiz = req.quiz;

	res.render('quizzes/edit', {quiz:quiz});	
};

// PUT /quizzes/:id
exports.update = function(req, res, next) {

	req.quiz.question = req.body.quiz.question;
	req.quiz.answer = req.body.quiz.answer;

	req.quiz.save({fields: ["question", "answer"]})
		.then(function(quiz) {
		req.flash('success', 'Quiz editado con éxito.');
			if(!req.file) {
				req.flash('info', 'Tenemos un Quiz sin imagen');
				if(quiz.Attachment) {
					cloudinary.api.delete_resources(quiz.Attachment.public_id);
					return quiz.Attachment.destroy();
				}
				return;
			}

			return uploadResourceToCloudinary(req)
			.then(function(uploadResult) {
				return updateAttachment(req, uploadResult, quiz);
			});
		})
		.catch(Sequelize.ValidationError, function(error) {

			req.flash('error', 'Errores en el formulario');
			for (var i in error.errors) {
				req.flash('error', error.errors[i].value);
			};

			res.render('quizzes/new', {quiz: quiz});
		})
		.catch(function(error) {
			req.flash('error', 'Error al crear un Quiz: '+error.message)
			next(error);
		});
};

// DELETE /quizzes/:id
exports.destroy = function(req, res, next){

	if(req.quiz.Attachment) {
		cloudinary.api.delete_resources(req.quiz.Attachment.public_id);
	}
	req.quiz.destroy()
		.then( function() {
			req.flash('success', 'Quiz borrado con éxito.');
			res.redirect('/quizzes');
		})
		.catch(function(error){
			req.flash('error', 'Error al editar el Quiz: '+error.message);
			next(error);
		});
};

exports.ownershipRequired = function(req, res, next){

	var isAdmin			= req.session.user.isAdmin;
	var quizAuthorId	= req.quiz.AuthorId;
	var loggedUserId	= req.session.user.id;

	if (isAdmin || quizAuthorId === loggedUserId) {
		next();
	} else {
		console.log('Operacion prohibida: El usuario logeado no es el autor del quiz, ni un administrador.');
		res.sen(403);
	}
};

function createAttachment(req, uploadResult, quiz) {
    if (!uploadResult) {
        return Promise.resolve();
    }

    return models.Attachment.create({ public_id: uploadResult.public_id,
                                      url: uploadResult.url,
                                      filename: req.file.originalname,
                                      mime: req.file.mimetype,
                                      QuizId: quiz.id })
    .then(function(attachment) {
        req.flash('success', 'Imagen nueva guardada con éxito.');
    })
    .catch(function(error) { // Ignoro errores de validacion en imagenes
        req.flash('error', 'No se ha podido salvar la nueva imagen: '+error.message);
        cloudinary.api.delete_resources(uploadResult.public_id);
    });
}


function updateAttachment(req, uploadResult, quiz) {
    if (!uploadResult) {
        return Promise.resolve();
    }

    // Recordar public_id de la imagen antigua.
    var old_public_id = quiz.Attachment ? quiz.Attachment.public_id : null;

    return quiz.getAttachment()
    .then(function(attachment) {
        if (!attachment) {
            attachment = models.Attachment.build({ QuizId: quiz.id });
        }
        attachment.public_id = uploadResult.public_id;
        attachment.url = uploadResult.url;
        attachment.filename = req.file.originalname;
        attachment.mime = req.file.mimetype;
        return attachment.save();
    })
    .then(function(attachment) {
        req.flash('success', 'Imagen nueva guardada con éxito.');
        if (old_public_id) {
            cloudinary.api.delete_resources(old_public_id);
        }
    })
    .catch(function(error) { // Ignoro errores de validacion en imagenes
        req.flash('error', 'No se ha podido salvar la nueva imagen: '+error.message);
        cloudinary.api.delete_resources(uploadResult.public_id);
    });
}


function uploadResourceToCloudinary(req) {
    return new Promise(function(resolve,reject) {
        var path = req.file.path;
        cloudinary.uploader.upload(path, function(result) {
                fs.unlink(path); // borrar la imagen subida a ./uploads
                if (! result.error) {
                    resolve({ public_id: result.public_id, url: result.secure_url });
                } else {
                    req.flash('error', 'No se ha podido salvar la nueva imagen: '+result.error.message);
                    resolve(null);
                }
            },
            cloudinary_image_options
        );
    })
}
