#!/usr/bin/env node

"use strict";

var util = require('util')
var exec = util.promisify(require('child_process').exec)
var download = require('download')
var JSONPath = require('JSONPath')
var fs = require('fs')
var bugs = JSON.parse(fs.readFileSync(__dirname + '/../docs/bugs.json', 'utf8'))

var bugsByName = {}
for (var i in bugs)
{
    if (bugs[i].name in bugsByName)
    {
        throw "Duplicate bug name: " + bugs[i].name
    }
    bugsByName[bugs[i].name] = bugs[i]
}

var tests = fs.readFileSync(__dirname + '/buglist_test_vectors.md', 'utf8')

var testVectorParser = /\s*#\s+(\S+)\s+## buggy\n([^#]*)## fine\n([^#]*)/g

var result;
while ((result = testVectorParser.exec(tests)) !== null)
{
    var name = result[1]
    var buggy = result[2].split('\n--\n')
    var fine = result[3].split('\n--\n')
    console.log("Testing " + name + " with " + buggy.length + " buggy and " + fine.length + " fine instances")

	checkRegex(name, buggy, fine)
	checkJSONPath(name, buggy, fine)
}

function checkRegex(name, buggy, fine)
{
    var regexStr = bugsByName[name].check['regex-source']
    if (regexStr !== undefined)
    {
        var regex = RegExp(regexStr)
        for (var i in buggy)
        {
            if (!regex.exec(buggy[i]))
            {
                throw "Bug " + name + ": Buggy source does not match: " + buggy[i]
            }
        }
        for (var i in fine)
        {
            if (regex.exec(fine[i]))
            {
                throw "Bug " + name + ": Non-buggy source matches: " + fine[i]
            }
        }
    }
}

function checkJSONPath(name, buggy, fine)
{
    var jsonPath = bugsByName[name].check['json-path']
    if (jsonPath !== undefined)
    {
        var url = "http://github.com/ethereum/solidity/releases/download/v" + bugsByName[name].introduced + "/solc-static-linux"
        var binary = __dirname + "/solc-static-linux"
        download(url, __dirname)
        .then(() => {
            return exec("chmod +x " + binary)
        })
        .then((data) => {
            for (var i in buggy)
            {
                checkJsonPath(buggy[i], binary, jsonPath, i)
                .then((result) => {
                    if (!result)
                        throw "Bug " + name + ": Buggy source does not contain path: " + buggy[i]
                })
            }
            for (var i in fine)
            {
                checkJsonPath(fine[i], binary, jsonPath, i + buggy.length)
                .then((result) => {
                    if (result)
                        throw "Bug " + name + ": Non-buggy source contains path: " + fine[i]
                })
            }
        })
        .catch((err) => {
            throw "Error in checking json-path for bug " + name + ": " + err
        })
    }
}

function checkJsonPath(code, binary, path, idx) {
    return new Promise(function(resolve, reject) {
        var solFile = __dirname + "/jsonPath" + idx + ".sol"
        var astFile = __dirname + "/ast" + idx + ".json"
        writeFilePromise(solFile, code)
        .then(() => {
            return exec(binary + " --ast-json " + solFile + " > " + astFile)
        })
        .then(() => {
            var jsonRE = /(\{[\s\S]*})/
            var ast = JSON.parse(jsonRE.exec(fs.readFileSync(astFile, 'utf8'))[0])
            var query = "$"
            for (var i in path)
            {
                var node = path[i]
                query += "..[?(@.name === '" + node.name + "'"
                if (node.type !== undefined)
                    query += " && @.attributes.type.startsWith('" + node.type + "')"
                query += ")]"
            }
            result = JSONPath({json: ast, path: query})
            if (result.length > 0)
                resolve(true)
            else
                resolve(false)
        })
        .catch((err) => {
            reject(err)
        })
        .finally(() => {
            exec("rm " + solFile + " " + astFile)
        })
    })
}

function writeFilePromise(filename, data) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(filename, data, 'utf8', function(err) {
            if (err) reject(err)
            else resolve(data)
        })
    })
}
