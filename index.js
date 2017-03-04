/**
 * Usage:
 *
 * MYSQL_PID=0000
 * MYSQL_HOST=localhost
 * MYSQL_USER=user
 * MYSQL_PASS=pass
 * MYSQL_DB=woo_speed
 * LOCAL_WP=http://localhost/
 * WOO_API_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * WOO_API_SEC=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * npm start
 */


var config = {
      // add your config here, or use environment variables
      // mySqlPID: 000,
      // mySqlHost: 'localhost',
      // mySqlUser: 'local-user'
      // mySqlPass: 'password'
      // mySqlDB: 'database'
      // postInsertChunkSize: 100,
      // iterations: 100,
      // localWP: 'http://localhost/',
      // wooAPIKey: 'ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      // wooAPISec: 'cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },

    fail = function(msg) {
      console.log(msg);
      process.exit();
    },

    timesSeries = require('async/timesSeries'),
    times = require('async/times'),
    loremIpsum = require('lorem-ipsum'),

    WooCommerceAPI = require('woocommerce-api'),
    WooCommerce = new WooCommerceAPI({
      url: process.env.LOCAL_WP || config.localWP || 'http://localhost',
      consumerKey: process.env.WOO_API_KEY || config.wooAPIKey || fail('Set WooCommerce API key'),
      consumerSecret: process.env.WOO_API_SEC || config.wooAPISec || fail('Set WooCommerce API secret'),
      version: 'v3'
    }),

    mySqlPID = process.env.MYSQL_PID || config.mySqlPID || fail('Set Mysql PID'),
    mysql = require('mysql'),
    connectionParams = {
      host     : process.env.MYSQL_HOST || config.mySqlHost || 'localhost',
      user     : process.env.MYSQL_USER || config.mySqlUser || fail('Set Mysql User'),
      password : process.env.MYSQL_PASS || config.mySqlPass || fail('Set Mysql Password'),
      database : process.env.MYSQL_DB || config.mySqlDB || fail('Set Mysql Password')
    },

    postInsertChunkSize = process.env.POST_INSERT_CHUNK || config.postInsertChunkSize || 100,
    iterations = process.env.ITERATIONS || config.iterations || 100,
    data = {
      x: [],
      insert: [],
      meta: [],
      api: [],
      product: [],
      shop: [],
      cpu: [],
      mem: []
    },

    fs = require('fs'),
    request = require('request'),

    usage = require( 'usage' ),
    cpu = [],
    mem = [];


// add a chunk of products via the WooCommerce API, default chunk size is 100
function addNProducts(done, n) {

  n = n || 100;

  // add simple products parallely with auto-generated content and random price
  times(n, function(i, next) {

    var data = {
      product: {
        title: loremIpsum({ count: Math.floor(Math.random() * 6) + 1, units: 'words' }),
        type: 'simple',
        regular_price: (Math.floor(Math.random() * 90000) + 10000) / 100,
        description: loremIpsum({ count: Math.floor(Math.random() * 300) + 1, units: 'words' }),
        short_description: loremIpsum({ count: Math.floor(Math.random() * 40) + 1, units: 'words' })
      }
    };

    WooCommerce.post('products', data, function(err, data, res) {
      next();
    });
  }, function(err, products) {
    done();
  });

}

// get the products list (default list size 10 set in WP)
function getProductFrontendTest(productUrl, done) {

  var start = new Date();

  request(productUrl, function (error, response, body) {
    var end = new Date() - start;
    done(end);
  });

}

// get the products list (default list size 10 set in WP)
function getShopFrontendTest(done) {

  var start = new Date(),
      uri = 'http://localhost/woo-speed/shop/';

  request(uri, function (error, response, body) {
    var end = new Date() - start;
    done(end);
  });

}

// get the products list (default list size 10 set in WP)
function getProductsTest(done) {

  var start = new Date();

    WooCommerce.get('products', function(err, body) {
      var end = new Date() - start;
      done(end, JSON.parse(body.body).products[5].permalink);
    });
}

// continously save cpu and mem usage for the mysqld process
setInterval(function () {

  usage.lookup(mySqlPID, { keepHistory: true }, function(err, result) {
    cpu.push(result.cpu);
    mem.push(result.memory);
  });

}, 50);

// start the benchmark
timesSeries(iterations, function(i, next) {

  var start = new Date();

  addNProducts(function() {

    var end = new Date() - start;

    console.log('Inserted ' + ((i+1) * postInsertChunkSize) + ' products, generating benchmark data!');

    data.x.push((i+1)*postInsertChunkSize);
    data.insert.push(end);

    // giving mysql and the GC some time to clean up, to get cleaner time
    // measurements
    setTimeout(function() {

      // get current meta-field count
      var connection = mysql.createConnection(connectionParams);
      connection.connect();
      connection.query('SELECT COUNT(*) as count FROM wp_postmeta', function (error, results, fields) {
        if (error) throw error;

        data.meta.push(results[0].count);

        cpu = [];
        mem = [];

        getProductsTest(function(productsTime, productUrl) {
          data.api.push(productsTime);

          getProductFrontendTest(productUrl, function(productFrontTime) {
            data.product.push(productFrontTime);

            getShopFrontendTest(function(shopFrontTime) {
              data.shop.push(shopFrontTime);

              data.cpu.push(parseInt(cpu.reduce(function(result, v2){
                  return result + v2;
              }, 0) / cpu.length));

              data.mem.push(parseInt(mem.reduce(function(result, v2){
                  return result + v2;
              }, 0) / mem.length / 1000 / 1000)); // MB

              next();

              console.log(Object.keys(data).reduce(function(log, key) {
                log[key] = data[key][data[key].length-1];
                return log;
              },{}));
            });
          });
        });

      });
      connection.end();
    }, 5000);

  }, postInsertChunkSize);

}, function(err, times) {

  var benchmark = '';
  benchmark += 'freemem;' + data.mem.join(';') + "\n";
  benchmark += 'cpu;' + data.cpu.join(';') + "\n";
  benchmark += 'posts;' + data.x.join(';') + "\n";
  benchmark += 'insert;' + data.insert.join(';') + "\n";
  benchmark += 'meta;' + data.meta.join(';') + "\n";
  benchmark += 'api;' + data.api.join(';') + "\n";
  benchmark += 'product;' + data.product.join(';') + "\n";
  benchmark += 'shop;' + data.shop.join(';') + "\n";

  fs.writeFile('benchmarks/benchmark-' + (new Date()).getTime() + '.csv', benchmark, function(err) {
    process.exit();
  });
});
