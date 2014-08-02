'use strict';

// modules
var browserify = require('browserify');
var clean = require('gulp-clean');
var collate = require('./tasks/collate');
var compile = require('./tasks/compile');
var concat = require('gulp-concat');
var connect = require('gulp-connect');
var csso = require('gulp-csso');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var imagemin = require('gulp-imagemin');
var plumber = require('gulp-plumber');
var prefix = require('gulp-autoprefixer');
var Q = require('q');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify');
var uglify = require('gulp-uglify');


// configuration
var config = {
	dev: true,
	src: {
		scripts: {
			fabricator: [
				'./src/fabricator/scripts/prism.js',
				'./src/fabricator/scripts/fabricator.js'
			],
			toolkit: './src/toolkit/assets/scripts/toolkit.js'
		},
		styles: {
			fabricator: './src/fabricator/styles/fabricator.scss',
			toolkit: './src/toolkit/assets/styles/toolkit.scss'
		},
		images: 'src/toolkit/assets/images/**/*',
		views: './src/toolkit/views/*.html',
		materials: [
			'components',
			'structures',
			'templates',
			'documentation'
		]
	},
	dest: './public'
};


// clean
gulp.task('clean', function () {
	return gulp.src([config.dest], {
		read: false
	})
	.pipe(clean());
});


// styles
gulp.task('styles:fabricator', function () {
	return gulp.src(config.src.styles.fabricator)
		.pipe(plumber())
		.pipe(sass({
			errLogToConsole: true
		}))
		.pipe(prefix('last 1 version'))
		.pipe(gulpif(!config.dev, csso()))
		.pipe(rename('f.css'))
		.pipe(gulp.dest(config.dest + '/fabricator/styles'))
		.pipe(gulpif(config.dev, connect.reload()));
});

gulp.task('styles:toolkit', function () {
	return gulp.src(config.src.styles.toolkit)
		.pipe(plumber())
		.pipe(sass({
			errLogToConsole: true
		}))
		.pipe(prefix('last 1 version'))
		.pipe(gulpif(!config.dev, csso()))
		.pipe(gulp.dest(config.dest + '/toolkit/styles'))
		.pipe(gulpif(config.dev, connect.reload()));
});

gulp.task('styles', ['styles:fabricator', 'styles:toolkit']);


// scripts
gulp.task('scripts:fabricator', function () {
	return gulp.src(config.src.scripts.fabricator)
		.pipe(plumber())
		.pipe(concat('f.js'))
		.pipe(gulpif(!config.dev, uglify()))
		.pipe(gulp.dest(config.dest + '/fabricator/scripts'))
		.pipe(gulpif(config.dev, connect.reload()));
});

gulp.task('scripts:toolkit', function () {
	return browserify(config.src.scripts.toolkit).bundle()
		.pipe(plumber())
		.pipe(source('toolkit.js'))
		.pipe(gulpif(!config.dev, streamify(uglify())))
		.pipe(gulp.dest(config.dest + '/toolkit/scripts'))
		.pipe(gulpif(config.dev, connect.reload()));
});

gulp.task('scripts', ['scripts:fabricator', 'scripts:toolkit']);


// images
gulp.task('images', ['favicon'], function () {
	return gulp.src(config.src.images)
		.pipe(imagemin())
		.pipe(gulp.dest(config.dest + '/toolkit/images'))
		.pipe(gulpif(config.dev, connect.reload()));
});

gulp.task('favicon', function () {
	return gulp.src('./src/favicon.ico')
		.pipe(gulp.dest(config.dest));
});


// collate
gulp.task('collate', function () {

	// 'collate' is a little different -
	// it returns a promise instead of a stream

	var deferred = Q.defer();

	var opts = {
		materials: config.src.materials,
		dest: config.dest + '/fabricator/data/data.json'
	};

	// run the collate task; resolve deferred when complete
	collate(opts, deferred.resolve);

	return deferred.promise;

});

// assembly
gulp.task('assemble:fabricator', function () {
	var opts = {
		data: config.dest + '/fabricator/data/data.json',
		template: false
	};

	return gulp.src(config.src.views)
		.pipe(compile(opts))
		.pipe(gulp.dest(config.dest))
		.pipe(gulpif(config.dev, connect.reload()));
});

gulp.task('assemble:templates', function () {
	var opts = {
		data: config.dest + '/fabricator/data/data.json',
		template: true
	};
	return gulp.src('./src/toolkit/templates/*.html')
		.pipe(compile(opts))
		.pipe(rename({
			prefix: 'template-'
		}))
		.pipe(gulp.dest(config.dest))
		.pipe(gulpif(config.dev, connect.reload()));
});

gulp.task('assemble', ['collate'], function () {
	gulp.start('assemble:fabricator', 'assemble:templates');
});


// build
gulp.task('build', ['clean'], function () {
	gulp.start('styles', 'scripts', 'images', 'assemble');
});


// server
gulp.task('connect', function () {
	connect.server({
		root: [config.dest],
		port: 9000,
		livereload: config.dev ? { port:(Math.floor(Math.random() * (35729 - 35720 + 1) + 35720)) } : false
	});
});


// watch
gulp.task('watch', ['connect'], function () {
	gulp.watch('src/toolkit/{components,structures,templates,documentation,views}/**/*.{html,md}', ['assemble']);
	gulp.watch('src/fabricator/styles/**/*.scss', ['styles:fabricator']);
	gulp.watch('src/toolkit/assets/styles/**/*.scss', ['styles:toolkit']);
	gulp.watch('src/fabricator/scripts/**/*.js', ['scripts:fabricator']);
	gulp.watch('src/toolkit/assets/scripts/**/*.js', ['scripts:toolkit']);
	gulp.watch(config.src.images, ['images']);
});


// development environment
gulp.task('dev', ['build'], function () {
	gulp.start('watch');
});


// default build task
gulp.task('default', function () {
	config.dev = false;
	gulp.start('build');
});
