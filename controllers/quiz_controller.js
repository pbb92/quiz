var models = require('../models');

//Autoload el quiz asociado a :quizId

exports.load = function(req, res, next, quizId) {
	models.Quiz.findById(quizId)
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
	models.Quiz.findAll({where : {question: {$like: s }}})
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
	var quiz = models.Quiz.build({ question: req.body.quiz.question,
								   answer: 	req.body.quiz.answer} );

//guarda en DB los campos pregunta y respuesta de quiz
	quiz.save({fields: ["question", "answer"]})
		.then(function(quiz) {
			req.flash('success', 'Quiz creado con éxito.');
			res.redirect('/quizzes');
		})
		.catch(function(error) {
			req.flash('error', 'Error al crear un Quiz: '+error.message)
			next(error);
		});
	};