const fs = require('fs');
const matter = require('gray-matter');
import isSameDay from 'date-fns/isSameDay';
import isBefore from 'date-fns/isBefore';
const React = require('react');
const ReactDOMServer = require('react-dom/server');
import {buildPage} from '../build';
import { blogPagesLength } from '../blog/settings/blog';

// components
import Post from '../blog/components/post/Post';
import List from '../blog/components/post/List';

// for storing a list of all the blog posts
let posts = [];

// fetch all the blog posts
fs.readdirSync(__dirname + '/../blog/posts').forEach(filename => {
    const blogContent = fs.readFileSync(`${__dirname + '/../blog/posts'}/${filename}`, "utf8");
    const {data, content} = matter(blogContent);
    const [date, path, ext] = filename.split(/[_.]/);
    data.published = new Date(data.published);
    data.updated = data.updated ? new Date(data.updated) : false;
    let latestDate = data.updated ? data.updated : data.published; // the most recent date for the post (published or update)
    // validate the file
    if (!date || !path || !ext || ext !== "md") { // check the filename structure
        console.error(`The blog post file ${filename} is the wrong format use YYYY-MM-DD_the-blog-path.md`);
    } else if (!isSameDay(new Date(date), latestDate )) { // check the dates match
        console.error(`The filename date for ${filename} is incorrect, must be the same day as the ${data.updated ? "updated" : "published"} date.`)
    } else if (isBefore(latestDate, new Date()) || process.env.PREVIEW) { // if the post is ready to be published
        // check if the post is already in the array
        let discard = false; // if newer version exists we will discard this post
        posts = posts.filter(function(post) {
            if (post.path === path) {
                if (isBefore(post.latestDate , latestDate)) {
                    return false;
                }
                discard = true; // the existing post in the array is newer so discard this post
            }
            return true;
        })
        // if the post is not discarded, add it to posts
        if (!discard) {
            posts.push({ path: path, latestDate: latestDate, data: data, content: content });
        }
    }
});

// map over posts array and create all the blog post pages
posts = posts.map(function(post) {
    buildPage(post.path, ReactDOMServer.renderToStaticMarkup(<Post {...post.data} content={post.content} />));
    return { path: post.path, date: post.latestDate, ...post.data }; // don't need the content anymore just the data
});

// sort the posts array in date order
posts = posts.sort(function(a, b) {
    return isBefore(b.date, a.date) ? -1 : isBefore(a.date, b.date) ? 1 : 0;
});

// create list pages
const buildListPages = function({category, list}) {
    let page = 1;
    let pageList = [];
    let pages = Math.ceil(list.length/blogPagesLength);
    let getPath = function({category, page}) {
        return `${category ? `${category}/` : ''}` + `${page > 1 ? "page/" : ''}` + `${page === 1 ? "index" : page}`
    };
    list.map(function(post, i) {
        if (pageList.length === blogPagesLength) {
            // build the page
            buildPage(getPath({ category, page }), ReactDOMServer.renderToStaticMarkup(<List category={category} posts={pageList} page={page} pages={pages} path={getPath({ category, page })} />));
            pageList = []; // empty pageList
            page++; // next page number
        }
        pageList.push(post);
    });
    // final page
    buildPage(getPath({ category, page }), ReactDOMServer.renderToStaticMarkup(<List category={category} posts={pageList} page={page} pages={pages} path={getPath({ category, page })} />));
};

// create blog pages
buildListPages({ list: posts });

// posts sorted by category
let categorisedPosts = posts.reduce(function(acc, post) {
    let key = post.categoryId;
    if (!acc[key]) {
        acc[key] = []; // create the key if it doesn't exist
    }
    acc[key].push(post); // add the post to the category
    return acc;
}, {});

// create category pages
for (let category in categorisedPosts) {
    buildListPages({ category, list: categorisedPosts[category]});
}

// buildPage("a-blog-post", ReactDOMServer.renderToStaticMarkup(<Post title={content.title} />));

// exports.buildPost = function(content) {
//     buildPage("a-blog-post", ReactDOMServer.renderToStaticMarkup(<Post title={content.title} />));
// };

// exports.buildPost = function(content) {
//     return ReactDOMServer.renderToStaticMarkup(<Post title={content.title} />)
// };

// exports.staticPage = async function(content) {
//     let Index = await import('../blog/components/pages/Index');
//     return ReactDOMServer.renderToStaticMarkup(<Index title={content.title} />)
// };