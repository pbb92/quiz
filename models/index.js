var path = require('path');

// Cargar ORM
var Sequelize = require('sequelize');

var url, storage;

if(!process.env.DATABASE_URL){
    url = "sqlite:///";
    storage = "quiz.sqlite";
} else{
    url = process.env.DATABASE_URL;
    storage = process.env.DATABASE_STORAGE || "";
}

var sequelize = new Sequelize(url, 
	 				{ storage: storage,
                      omitNull: true
                    });

// Importar la definicion de la tabla Quiz de quiz.js
var Quiz = sequelize.import(path.join(__dirname,'quiz'));

// Importar la definicion de la tabla Comments de comment.js
var Comment = sequelize.import(path.join(__dirname, 'comment'));

// Importar la definicion de la tabla Users de user.js
var User = sequelize.import(path.join(__dirname, 'user'));

//Importar definicion de tabla attachments de attachment.js
var Attachment = sequelize.import(path.join(__dirname, 'attachment'));
// Relaciones entre modelos
Comment.belongsTo(Quiz);
Quiz.hasMany(Comment);

// realcion 1 a N entre user y quiz
User.hasMany(Quiz, {foreignKey: 'AuthorId'});
Quiz.belongsTo(User, {as: 'Author', foreignKey: 'AuthorId'});

// realcion 1 a N entre user y quiz
User.hasMany(Comment, {foreignKey: 'AuthorI'});
Comment.belongsTo(User, {as: 'Author', foreignKey: 'AuthorI'});

//Relacion 1 a 1 entre quiz y attachment
Attachment.belongsTo(Quiz);
Quiz.hasOne(Attachment);

exports.Quiz = Quiz; // exportar definición de tabla Quiz
exports.Comment = Comment; // exportar definicion de tabla comments
exports.User = User; // exportar definicion de tabal Users
exports.Attachment = Attachment;