const fetch = require('fetch-retry');
const xml2js = require('xml2js');

async function fetchTaxonomy(options) {
    let data = await fetch(options.taxonomyUrl, {
        method: 'GET',
        headers: options.headers,
    });
    data = await data.text();
    data = await parseString(data);
    return data;
}

function parseString(str) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(str, (err, res) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
}

module.exports = fetchTaxonomy;
