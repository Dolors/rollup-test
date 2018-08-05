import $ from 'jquery';
import axios from 'axios';
import _difference from 'lodash/difference';

async function test() {
    setTimeout(() => {
        console.log(123);
    }, 3000);
}

test();

axios.get('//code.jquery.com/jquery-3.3.1.slim.min.js').then(() => {
});

console.log(_difference([3, 2, 1], [4, 2]));