var ElasticSearchClient = require('elasticsearchclient')
  , _ = require('underscore')
  , fs = require('fs')
  , path = require('path')
  , serverOptions = {
    hosts: [
      {
        host: 'localhost',
        port: 9200
      }
    ]
  }

var elasticSearchClient = new ElasticSearchClient(serverOptions);

exports.popular = function (req, res) {
  fs.readFile(path.dirname(__dirname) + '/popular.json', function (err, content) {
    if (err) {
      res.api({success: false, error: 'Can not list popular.json'});
      return;
    }

    var populars = JSON.parse(content);
    elasticSearchClient.multiget('static', 'libs', populars)
      .on('data', function (data) {
        data = JSON.parse(data);

        data = _.map(data.docs, function (lib) {
          return lib._source;
        });

        res.api({libs: data});
      })
      .on('done', function () {
        //always returns 0 right now
      })
      .on('error', function (error) {
        res.api({success: false, error: error});
      })
      .exec()
  });
}

exports.search = function (req, res) {
  var q = req.query.q.toLowerCase();

  var qryObj ={
    query: {
      'dis_max': {
        'queries': [
          {
            'prefix': { 'name': q }
          },
          //{
          //  'text': { 'name': q }
          //},
          {
            'term': { 'keywords': q }
          }
        ]
      }
    },
    size: req.query.count || 30
  };


  elasticSearchClient.search('static', 'libs', qryObj)
    .on('data', function (data) {
      data = JSON.parse(data);

      if (data.hits) {
        data.hits.libs = _.map(data.hits.hits, function (lib) {
          return lib._source;
        });

        delete data.hits.hits;

        res.api(data.hits);
      } else {
        res.api({total: 0, max_score: 0, libs: []});
      }
    })
    .on('done', function () {
      //always returns 0 right now
    })
    .on('error', function (error) {
      res.api({success: false, error: error});
    })
    .exec()
};

exports.show = function (req, res) {
  var name = req.params.package;

  elasticSearchClient.get('static', 'libs', name)
    .on('data', function (data) {
      data = JSON.parse(data);
      if (!data.exists) {
        res.statusCode = 404;
        res.api({success: false, error: 'Non-exists package'});
        return;
      }
      res.api(data._source);
    })
    .on('done', function () {
    })
    .on('error', function (error) {
      res.api({success: false, error: error});
    })
    .exec()
};