import * as pkg from './package.json';

import gulp from 'gulp';

//Bundling:
import sass from 'node-sass';
import pug  from 'pug';
import include from 'gulp-include';
import replace from 'gulp-replace';
import umd from 'gulp-umd';

//Cleanup & minification:
import strip  from 'gulp-strip-comments';
import header from 'gulp-header';
import rename from 'gulp-rename';
import uglify from 'gulp-uglify';

//Automatically build/reload on file changes:
import { spawn } from 'child_process';


const inFile = 'src/main.js',
      globalName = 'Picker',
      outFolder = 'dist/',
      //Remove scope (if any) from output path:
      outFile = pkg.name.replace(/.*\//, '') + '.js';

const myBanner = `/*!
 * <%= pkg.name %> v<%= pkg.version %>
 * <%= pkg.homepage %>
 *
 * Copyright 2017-<%= new Date().getFullYear() %> <%= pkg.author %>
 * Released under the <%= pkg.license %> license.
 */
`;


/* Generate the /dist files */

gulp.task('build', function(cb) {

    //Compile the HTML and CSS we'll inline into the JS:
    const sassed = sass.renderSync({
        file: inFile.replace('.js', '.scss'),
        outputStyle: 'compressed',
    });
    const css = sassed.css.toString(); //(Buffer.toString())
    //console.log('CSS:', css);
    
    const html = pug.renderFile(inFile.replace('.js', '.pug'));
    //console.log('HTML:', html);

    return gulp.src(inFile)
        .pipe(include())
          .on('error', console.log)

        .pipe(replace( '## PLACEHOLDER-CSS ##', css.replace(/'/g, "\\'").trim() ))
        .pipe(replace( '## PLACEHOLDER-HTML ##', html ))
        
        //UMD wrapper
        .pipe(umd({
            exports:   (file) => globalName,
            namespace: (file) => globalName,
        }))

        //Write un-minified:
        //.pipe(strip())
        .pipe(rename(outFile ))
        .pipe(header(myBanner, { pkg : pkg }))
        .pipe(gulp.dest(outFolder))

        //Minify:
        .pipe(rename({ extname: '.min.js' }))
        .pipe(uglify())

        .pipe(header(myBanner, { pkg: pkg }))
        .pipe(gulp.dest(outFolder))
});


/* The rest of these tasks are only here to run 'build' automatically when files change */


//https://github.com/gulpjs/gulp/blob/master/docs/API.md#gulpwatchglobs-opts-fn
//https://css-tricks.com/gulp-for-beginners/
gulp.task('watch', function() {
    console.log('** Listening for file changes...');

    //Rebuild when anything in src/ changes:
    //https://stackoverflow.com/questions/27645103/how-to-gulp-watch-multiple-files
    const watcher = gulp.watch(['src/**/*.*'], gulp.parallel('build'));
    
    watcher.on('change', function(path, stats) {
      console.log('File ' + path + ' was changed');
    });
    watcher.on('unlink', function(path) {
      console.log('File ' + path + ' was removed');
    });
});


gulp.task('startup', gulp.series('build', 'watch'));


//In addition to listening for code changes, we also need to restart gulp whenever package.json or gulpfile.babel.js change
//https://stackoverflow.com/questions/22886682/how-can-gulp-be-restarted-upon-each-gulpfile-change
//https://gist.github.com/tilap/31167027ddee8acbf0e7
gulp.task('auto-reload', function() {
    let p;
    
    gulp.watch(['*.js*'], spawnChildren);
    spawnChildren();
    
    function spawnChildren(callback) {
        //Kill previous spawned process
        if(p) { p.kill(); }
        
        //`spawn` a child `gulp` process linked to the parent `stdio`
        p = spawn('gulp', ['startup'], { stdio: 'inherit' });

        //https://github.com/gulpjs/gulp/blob/master/docs/API.md#fn-1
        if(callback) {
            console.log('package.json or gulpfile.babel.js changed, restarted..');
            callback();
        }
    }
});


gulp.task('default', gulp.series('auto-reload'));
