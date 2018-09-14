
// 引入gulp
const gulp = require('gulp')
// 全局配置  因为是模块了。所以不用写.js了
// const config = require('./config/index')
const config = require('./config') // 在这里因为取的是index，所以可以省略index
// 压缩html
const htmlmin = require('gulp-htmlmin')
// 热更新服务器
const connect = require('gulp-connect')
// 合并文件
const concat = require('gulp-concat')
// 压缩css
const minifycss = require('gulp-minify-css')
// 给css加前缀
const autoprefixer = require('gulp-autoprefixer')
// 重命名
const rename = require('gulp-rename')
// 合并文件操作流
const merge = require('merge-stream')
// 小型webpack
const webpack = require('webpack-stream')
// 自动引入依赖文件
const inject = require('gulp-inject')
// 编译sass
const sass = require('gulp-sass')
//压缩图片
const imagemin = require('gulp-imagemin')
//深度压缩图片
const pngquant = require('imagemin-pngquant')
//只压缩修改的图片。压缩图片时比较耗时，在很多情况下我们只修改了某些图片，没有必要压缩所有图片，
//使用”gulp-cache”只压缩修改的图片，没有修改的图片直接从缓存文件读取
const cache = require('gulp-cache')
//Smushit是Yahoo开发的一款用来优化PNG和JPG的插件，它的原理是移除图片文件中不必要的数据。
//这是一个无损压缩工具，这意味着优化不会改变图片的显示效果和质量。
//优势：易配置    劣势：只能处理JPG和PNG
const smushit = require('gulp-smushit');


// 处理html，将src中的html文件输出到dist中去
gulp.task('handle:html', function () {
    return gulp.src('./src/views/*/*.html')
        // .pipe(htmlmin(config.htmloptions))
        .pipe(gulp.dest('./dist'))
})

// 处理css， 合并css， 压缩css， 前缀，输出
gulp.task('handle:css', function () {
    let streams = [] //存放下面多个文件流的数组
    for (const page in config.cssoptions) { // 遍历多个页面
        for (const file in config.cssoptions[page]) { // 遍历各个页面中的多个打包css文件配置
            let stream = gulp.src(config.cssoptions[page][file])
                .pipe(sass({outputStyle: 'compressed'}))// 把scss编译成css
                .pipe(autoprefixer({// 自动加前缀
                    browsers: ['last 2 versions','Safari >0', 'Explorer >0', 'Edge >0', 'Opera >0', 'Firefox >=20'],//last 2 versions- 主流浏览器的最新两个版本
                    cascade: false, //是否美化属性值 默认：true 像这样：
                    //-webkit-transform: rotate(45deg);
                    //        transform: rotate(45deg);
                    remove:true //是否去掉不必要的前缀 默认：true 
                }))
                .pipe(concat(file + '.css')) // 合并文件
                // .pipe(minifycss()) // 压缩文件
                .pipe(rename({suffix:'.min'})) //重命名
                .pipe(gulp.dest('./dist/'+ page +'/css')) // 输出到对应的目录中
            
            streams.push(stream) // 把当前的文件流存储到数组中
        }
    }
    return merge( ...streams )//合并多个文件流
})

// 处理js es6-> es5 合并 压缩
gulp.task('handle:js', function () {
    let streams = []
    for (const page in config.jsoptions) {
        //判断如果入口是数组或者是字符串的话就是单出口，否则是多出口
        let entry = config.jsoptions[page]
        let filename = Array.isArray(entry) || ((typeof entry) === 'string') ? page : '[name]'
        let stream = gulp.src('src/entry.js')
            .pipe(webpack({
                mode: 'production',// 设置打包模式： none development production(会压缩代码)
                entry: entry,// 入口
                output: { filename: filename+'.min.js' },//出口filename 代表在entry中键名是什么，打包出来的就是什么
                module: {
                    rules: [ //webpack中在这里使用各种loader对代码进行各种编译
                        {
                            test: /\.js$/, // 对js文件进行处理
                            loader: 'babel-loader', // 使用babel-loader对其进行处理
                            query: {
                                presets: ['es2015'] // 将es6编译一下
                            }
                        }
                    ]
                }
            }))
            .pipe(gulp.dest('./dist/' + page + '/js'))
        streams.push(stream)
    }

    return merge( ...streams )

})

//专门给各个页面的html文件添加对应的依赖
gulp.task('inject', function () {
    setTimeout(() => {
        config.pages.forEach(page => {
            var target = gulp.src('./dist/'+page+'/'+page+'.html');
            // It's not necessary to read the files (will speed up things), we're only after their paths:
            var sources = gulp.src(['./dist/'+page+'/js/*.js', './dist/'+page+'/css/*.css'], {read: false});
           
            target.pipe(inject(sources, { ignorePath: '/dist' }))
              .pipe(gulp.dest('./dist/'+page+''));
        })
    }, 1000);  
});

//压缩图片
gulp.task('handle:image',function(){
	return gulp.src('./src/images/*.{png,jpg,gif,ico}')
	.pipe(smushit({
            verbose: true
        }))
	.pipe(cache(imagemin({
            optimizationLevel: 5, //类型：Number  默认：3  取值范围：0-7（优化等级）
            progressive: true, //类型：Boolean 默认：false 无损压缩jpg图片
            interlaced: true, //类型：Boolean 默认：false 隔行扫描gif进行渲染
            multipass: true ,//类型：Boolean 默认：false 多次优化svg直到完全优化
            svgoPlugins: [{
            	removeViewBox: false
            }],//不要移除svg的viewbox属性
            use: [pngquant()] //使用pngquant深度压缩png图片的imagemin插件
        })))
    .pipe(gulp.dest('dist/img'))
})


// 监听函数
gulp.task('watch', function () {
    gulp.watch('./src/views/*/*.html', ['handle:html', 'inject', 'reload'])
    gulp.watch('./src/**/*.scss', ['handle:css', 'inject', 'reload'])
    gulp.watch('./src/**/*.js', ['handle:js', 'inject', 'reload'])
    // 通配符中 * 指的是儿子这一代，** 指的是所有的后代
})

//创建热更新服务器
gulp.task('server', function () {
    connect.server(config.serveroptions)
})

// 让服务器刷新的任务
gulp.task("reload", function(){
	return gulp.src("./dist/**/*.html") //让所有的html文件都重新加载一下
		.pipe(connect.reload());
})

// 默认任务
gulp.task('default', ['server', 'handle:html', 'handle:css', 'handle:js', 'inject', 'watch'])