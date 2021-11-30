/**
 * Copied from Modernizr source code:
 * https://github.com/Modernizr/Modernizr/blob/28d969e85cd8ebe5854f6296fd6aace241f6bdf7/feature-detects/storage/localstorage.js
 *
 * Reference: https://stackoverflow.com/a/16427747/8581025
 *
 * The license is below the code.
 */

/**
 * Check if local storage is available
 * @returns {boolean}
 */
export function getIfLocalStorageIsAvailable() {
  try {
    localStorage.setItem('__test', 'test');
    localStorage.removeItem('__test');
    return true;
  } catch (e) {
    return false;
  }
}

/*
The MIT License (MIT)

Copyright (c) 2021 The Modernizr Team | Modernizr 4.0.0-alpha

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
