const babel = require('gulp-babel');
const clean = require('gulp-clean');
const eslint = require('gulp-eslint');
const gulp = require('gulp');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const terser = require('gulp-terser');

// Clean dist directory
gulp.task('clean', () => {
    return gulp.src('dist', {
            read: false,
            allowEmpty: true
        })
        .pipe(clean());
});

// Lint source
gulp.task('lint', () => {
    return gulp.src(['src/*.js'])
        .pipe(eslint())
        // eslint.format() outputs the lint results to the console.
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on
        // lint error, return the stream and pipe to failAfterError last.
        .pipe(eslint.failAfterError());
});

// Copy source file to dist directory
gulp.task('copy', () => {
    return gulp.src('src/*.js')
        .pipe(gulp.dest('dist'));
});

// Transpile es6 to es2015 for dist
gulp.task('transpile', function () {
    return gulp.src('src/*.js')
        .pipe(babel({
            presets: ['@babel/preset-env']
        }))
        .pipe(rename((path) => {
            path.basename += '.es5';
        }))
        .pipe(gulp.dest('dist'));
});

// Minify es6 source for dist
gulp.task('minify', function () {
    return gulp.src('src/*.js')
        .pipe(sourcemaps.init())
        .pipe(terser())
        .pipe(sourcemaps.write('./'))
        .pipe(rename((path) => {
            if (path.extname === '.js') {
                path.basename += '.min';
            }
        }))
        .pipe(gulp.dest('dist'));
});

// Minify es2016 source for dist
gulp.task('minify-es5', function () {
    return gulp.src('dist/noose.es5.js')
        .pipe(sourcemaps.init())
        .pipe(terser())
        .pipe(sourcemaps.write('./'))
        .pipe(rename((path) => {
            if (path.extname === '.js') {
                path.basename += '.min';
            }
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('default', gulp.series('clean', 'lint', 'copy', 'transpile', 'minify', 'minify-es5'));
