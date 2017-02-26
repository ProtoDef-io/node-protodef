const gulp = require('gulp');

const plumber = require('gulp-plumber');
const babel = require('gulp-babel');
const options = {
  presets: ['es2015'],
  "plugins": ["transform-object-rest-spread"]
};

const sourcemaps = require('gulp-sourcemaps');

gulp.task('compile', function() {
  return gulp
    .src('src/**/*.js')
    .pipe(plumber({
      errorHandler: function(err) {
        console.error(err.stack);
        this.emit('end');
      }
    }))
    .pipe(sourcemaps.init())
    .pipe(babel(options))
    .pipe(plumber.stop())
    .pipe(sourcemaps.write('maps/'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('watch', function() {
  return gulp.watch('src/**/*.js', ['compile']);
});

gulp.task('default', ['compile']);
