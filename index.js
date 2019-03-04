const fetch = require('fetch-retry');
const fetchTaxonomy = require('./src/fetch-taxonomy');
const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const { jsonToCsv } = require('@hutsoninc/utils');

async function run() {
    let options = {
        baseUrl: 'https://www.deere.com',
        taxonomyUrl: `https://www.deere.com/en/us-en.taxonomy`,
        append: 'index.json',
        headers: {},
    };

    console.log('Fetching taxonomy...');
    let data = await fetchTaxonomy(options);

    let urls = getUrls(data);

    let errs = [];

    console.log('Checking status of product index.json files...');
    let promises = urls.map(url => {
        return fetch(options.baseUrl + url + options.append, {
            method: 'GET',
            headers: options.headers,
        })
            .then(res => {
                if (res.status !== 200) {
                    errs.push(res.url);
                }
            })
            .catch(err => {
                console.log(err);
            });
    });

    await Promise.all(promises);

    console.log('Errors:', errs.length);

    console.log('Checking status of product pages...');
    promises = errs
        .map(jsonUrl => {
            let url = jsonUrl;
            if (url) {
                url = url.split('/');
                url[url.length - 1] = '';
                url = url.join('/');
            } else {
                return;
            }
            return fetch(url, {
                method: 'GET',
                headers: options.headers,
            })
                .then(res => {
                    return {
                        status: res.status,
                        statusText: res.statusText,
                        responseUrl: res.url,
                        fetchedUrl: url,
                    };
                })
                .catch(err => {
                    console.log(err);
                });
        })
        .filter(obj => obj);

    urls = await Promise.all(promises);

    let changed = [];
    let missing = [];

    urls = urls
        .map(obj => {
            if (obj.status === 200 && obj.fetchedUrl !== obj.responseUrl) {
                changed.push({
                    old_url: obj.fetchedUrl,
                    new_url: obj.responseUrl,
                });
                return;
            } else if (
                obj.status === 404 &&
                obj.fetchedUrl === obj.responseUrl
            ) {
                missing.push({ url: obj.fetchedUrl });
                return;
            }
            return obj;
        })
        .filter(obj => obj);

    console.log('Writing results...');
    if (!fs.existsSync(path.join(__dirname, 'data'))) {
        fs.mkdirSync(path.join(__dirname, 'data'));
    }
    fs.writeFileSync(
        path.join(__dirname, 'data/changed-urls.csv'),
        jsonToCsv(changed, ['old_url', 'new_url'])
    );

    fs.writeFileSync(
        path.join(__dirname, 'data/404-urls.csv'),
        jsonToCsv(missing, ['url'])
    );
}

function getUrls(data, arr = []) {
    for (let i in data) {
        if (typeof data[i] === 'object') {
            if (Array.isArray(data[i]) && data[i][0].sku && data[i][0].path) {
                if (data[i][0].sku[0] && data[i][0].path[0]) {
                    arr.push(data[i][0].path[0]);
                }
            } else {
                getUrls(data[i], arr);
            }
        }
    }
    return arr;
}

run()
    .then(() => {
        console.log('Finished!');
        process.exit(0);
    })
    .catch(err => {
        console.log(err);
        process.exit(1);
    });
