'use strict';
const fs = require('fs');
const path = require('path');
const fileType = require('file-type');
const globby = require('globby');
const makeDir = require('make-dir');
const pify = require('pify');
const pPipe = require('p-pipe');
const replaceExt = require('jmazm-replace-ext');

const fsP = pify(fs);

/**
 * 处理文件
 * @param input 入口
 * @param output 出口
 * @param opts 可选
 * @example {
 * imageName： 图片的名称，这个是自己添加的，没有后缀名
 * }
 */
const handleFile = (input, output, opts) => fsP.readFile(input).then(data => {
	let dest = ''
	if (opts.imageName) {
	dest = output ? path.join(output, opts.imageName) : null;
} else {
	dest = output ? path.join(output, path.basename(input)) : null;
}

if (opts.plugins && !Array.isArray(opts.plugins)) {
	throw new TypeError('The plugins option should be an `Array`');
}

const pipe = opts.plugins.length > 0 ? pPipe(opts.plugins)(data) : Promise.resolve(data);

return pipe
	.then(buf => {
	buf = buf.length < data.length ? buf : data;

const ret = {
	data: buf,
	path: (fileType(buf) && fileType(buf).ext === 'webp') ? replaceExt(dest, '.webp') : dest
};

if (!dest) {
	return ret;
}

return makeDir(path.dirname(ret.path))
	.then(() => fsP.writeFile(ret.path, ret.data))
.then(() => ret);
})
.catch(err => {
	err.message = `Error in file: ${input}\n\n${err.message}`;
throw err;
});
});

module.exports = (input, output, opts) => {
	console.log(opts)
	if (!Array.isArray(input)) {
		return Promise.reject(new TypeError('Expected an array'));
	}

	if (typeof output === 'object') {
		opts = output;
		output = null;
	}

	opts = Object.assign({plugins: []}, opts);
	opts.plugins = opts.use || opts.plugins;

	return globby(input, {nodir: true}).then(paths => Promise.all(paths.map(x => handleFile(x, output, opts))));
};

module.exports.buffer = (input, opts) => {
	if (!Buffer.isBuffer(input)) {
		return Promise.reject(new TypeError('Expected a buffer'));
	}

	opts = Object.assign({plugins: []}, opts);
	opts.plugins = opts.use || opts.plugins;

	const pipe = opts.plugins.length > 0 ? pPipe(opts.plugins)(input) : Promise.resolve(input);

	return pipe.then(buf => buf.length < input.length ? buf : input);
};
