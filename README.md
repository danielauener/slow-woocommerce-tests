# Slow WooCommerce Tests

A small npm test app for testing WooCommerce performance with many posts.

## Warning

This test application inserts and removes rows from the target database. Be sure
to only use it if you have done a backup or a test-database dedicated just to
the test-tool.

## Description

This tool was used for some
[Slow WooCommerce with many products](http://www.danielauener.com/slow-woocommerce-many-products/)
tests, which you might want to read to understand the material in the benchmarks
directory. 

This app incrementally adds products to WooCommerce by using the WooCommerce
API. After each insertion of data, the application pauses five seconds, to give
garbage collection and MySql a break and then performs some tests, like reading
products from the WooCommerce API or requesting the "Shop"-page from the
front-end, while measuring both request-time and the average of the MySql cpu
and memory usage.

The inserted products are simple WooCommerce products, with auto-generated
lorem-ipsum titles, description and a random price.

## Setup

After cloning, go to the app folder and run

`npm install`

Then adjust the configuration parameters in index.js to your environment and run
the application with a simple

`npm start`

Configuration might be adjusted in the `index.js` files config-object or via
environment variables:

    MYSQL_PID=0000 MYSQL_HOST=localhost MYSQL_USER=user MYSQL_PASS=pass MYSQL_DB=woo_speed LOCAL_WP=http://localhost/ WOO_API_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx WOO_API_SEC=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx POST_INSERT_CHUNK=100 ITERATIONS=100 REMOVE_META=false npm start

After completing the test cycle, the test data is written to a benchmark csv
file in the benchmark directory of the app directory.

*Feedback and contributions very welcome!*
