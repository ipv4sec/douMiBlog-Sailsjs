const { fetchArticlesByUser, fetchArticlesByArchive, fetchArticlesByTag, fetchArticlesByCat ,fetchArticleDetail, fetchArticleList, fetchHottestArticles, fetchCatList, fetchTagsList, fetchArchiveList } = require('../services/BlogService')
const { fetchBlogStatistics, updateWebsiteStat, websiteChangelog } = require('../services/CommonService')



module.exports = {
  fetchArticleList: async function(req, res) {
    try {
    const { currentPage } = req.query

    const result = await fetchArticleList(currentPage)

      return res.json({
        status: 1,
        result: { articles: result.articles.map(item => ({ title: item.title, slug: item.slug, tagsArray: item.tagsArray, picture: item.picture, archiveTime: item.archiveTime, digest: item.digest })) }
      })
    } catch(err) {
      sails.log.error('fetch article list error: ', err)
      return res.status(200).json({
        status: 0,
        msg: '系统出错，请稍后重试'
      })
    }
  },
  fetchBlogArchiveList: async function(req, res) {
    try {
      const result = await fetchArchiveList()

      return res.json({
        status: 1,
        result
      })
    } catch(err) {
      sails.log.error('fetch blog archives error: ', err)
      return res.status(200).json({
        status: 0,
        msg: '系统出错，请稍后重试'
      })
    }
  },
  fetchBlogCatList: async function(req, res) {
    try {
      const result = await fetchCatList()

      return res.json({
        status: 1,
        result
      })
    } catch(err) {
      sails.log.error('fetch blog categories error: ', err)
      return res.status(200).json({
        status: 0,
        msg: '系统出错，请稍后重试'
      })
    }
  },
  fetchBlogTagsList: async function(req, res) {
    try {
      const result = await fetchTagsList()

      return res.json({
        status: 1,
        result
      })
    } catch(err) {
      sails.log.error('fetch blog tags error: ', err)
      return res.status(200).json({
        status: 0,
        msg: '系统出错，请稍后重试'
      })
    }
  },
  fetchBlogDetail: async function(req, res) {
    try {
      const { slug } = req.query
      const result = await fetchArticleDetail(slug)

      return res.json({
        status: 1,
        result
      })
    } catch(err) {
      sails.log.error('fetch blog detail error: ', err)
      return res.status(200).json({
        status: 0,
        msg: '系统出错，请稍后重试'
      })
    }
  },
  index: async function (req, res){
    // 获得当前需要加载第几页
    var page = req.param('page') ? parseInt(req.param('page')) : 1;

    const [articleObj, hotterArticles, statistics, cats, tags, archives] = await Promise.all([
      fetchArticleList(page),
      fetchHottestArticles(10),
      fetchBlogStatistics(),
      fetchCatList(),
      fetchTagsList(),
      fetchArchiveList()
    ])
    const result = {
      ...articleObj,
      ...statistics,
      hotterArticles,
      categories: cats,
      currentPage: page,
      tags,
      archives
    }

    updateWebsiteStat(statistics, req)
    return res.view(
      'articleLists',
      result
    );
  },

  showOneArticle: async function (req, res){
    try {
      var articleUrl = req.param('url');

      const [article, hotterArticles, statistics, cats, tags, archives] = await Promise.all([
        fetchArticleDetail(articleUrl),
        fetchHottestArticles(10),
        fetchBlogStatistics(),
        fetchCatList(),
        fetchTagsList(),
        fetchArchiveList()
      ])
      let reqIp = ''
      if (req.headers['x-real-ip'] === undefined){
        reqIp = req.ip;
      }else{
        reqIp = req.headers['x-real-ip'];
      }
      //  如果用户的IP地址不在该文章的访客列表中,那么就认为该用户对于
      //  这篇文章来说是新的阅读者，注意文章的访客列表每天清空一次
      if (article && article.pageViews.indexOf(reqIp) === -1){

        article.pageViews.push(reqIp);

        Article.update(article.id,
          {
          pageViews: article.pageViews,
          pageViewsCount: article.pageViewsCount + 1
          }
        ).exec(function(err, article){
          if(err){
            console.log(err);
          }else{
            //console.log(record);
          }
        });
        // 如果访问该文章的用户IP不在全局访问列表中，那么就认为该用户是网站
        // 的新用户, 注意该全局访问IP表也是每天清空一次
        updateWebsiteStat(statistics, req)
      }

      const result = {
        article,
        ...statistics,
        hotterArticles,
        categories: cats,
        breadcrumb: [article.title],
        tags,
        archives
      }
      return res.view('articleShow', result);
    } catch(err) {
      console.error('crash occur at showOneArticle: ', articleUrl);
      console.error('error code: ', err);
      return res.send('获取文章分类失败,请联系管理员。');
    }
  },
  showOneCategory: async function (req, res){
    // 获得当前需要加载第几页
    var page = req.param('page') ? req.param('page') : 1;
    var queryCategory = req.param('url');
    try{
      const [articleObj, hotterArticles, statistics, cats, tags, archives] = await Promise.all([
        fetchArticlesByCat(queryCategory, page),
        fetchHottestArticles(10),
        fetchBlogStatistics(),
        fetchCatList(),
        fetchTagsList(),
        fetchArchiveList()
      ])
      const result = {
        articles: articleObj.articles.map(function(item){item.archiveTime = item.archiveTime.substr(0, 10);  return item;}),
        ...statistics,
        hotterArticles,
        categories: cats,
        breadcrumb: ['分类', queryCategory],
        pageUrl: '/blog/category/' + queryCategory + '/page',
        currentPage: page,
        pageNum: Math.ceil(articleObj.totalQueryArticles[0].articles.length/5),
        tags,
        archives
      }
      return res.view(
        'articleLists',
        result
      );
    }catch(err){
      console.error('crash occur at showOneCategory: ', page, queryCategory);
      console.error('error code: ', err);
      return res.send('获取文章分类失败,请联系管理员。');
    }
  },

  showOneTag: async function (req, res){
    // 获得当前需要加载第几页
    var page = req.param('page') ? req.param('page') : 1;
    var queryTag = req.param('url');

    try{
      const [articleObj, hotterArticles, statistics, cats, tags, archives] = await Promise.all([
        fetchArticlesByTag(queryTag, page),
        fetchHottestArticles(10),
        fetchBlogStatistics(),
        fetchCatList(),
        fetchTagsList(),
        fetchArchiveList()
      ])
      const result = {
        articles: articleObj.articles.map(function(item){item.archiveTime = item.archiveTime.substr(0, 10);  return item;}),
        ...statistics,
        hotterArticles,
        categories: cats,
        breadcrumb: ['标签', queryTag],
        pageUrl: '/blog/tag/' + queryTag + '/page',
        currentPage: page,
        pageNum: Math.ceil(articleObj.totalQueryArticles[0].articles.length/5),
        tags,
        archives
      }
      return res.view(
        'articleLists',
        result
      );
    }catch(err){
      console.error('crash occur at showOneTag: ', page, queryTag);
      console.error('error code: ', err);
      return res.send('获取文章标签失败,请联系管理员。');
    }
  },

  showOneArchive: async function (req, res){

    var page = req.param('page') ? req.param('page') : 1;
    var queryArchive = req.param('url');

    try{
      const [articleObj, hotterArticles, statistics, cats, tags, archives] = await Promise.all([
        fetchArticlesByArchive(queryArchive, page),
        fetchHottestArticles(10),
        fetchBlogStatistics(),
        fetchCatList(),
        fetchTagsList(),
        fetchArchiveList()
      ])
      const result = {
        articles: articleObj.articles.map(function(item){item.archiveTime = item.archiveTime.substr(0, 10);  return item;}),
        ...statistics,
        hotterArticles,
        categories: cats,
        breadcrumb: ['归档', queryArchive],
        pageUrl: '/blog/archive/' + queryArchive + '/page',
        currentPage: page,
        pageNum: Math.ceil(articleObj.totalQueryArticles[0].articles.length/5),
        tags,
        archives
      }
      return res.view(
        'articleLists',
        result
      );
    }catch(err){
      console.error('crash occur at showOneArchive: ', page, queryArchive);
      console.error('error code: ', err);
      return res.send('获取文章归档失败,请联系管理员。');
    }
  },
  showOneUser: async function(req, res){
    var page = req.param('page') ? req.param('page') : 1;

    var queryUser = req.param('url');

    try{
      const [articleObj, hotterArticles, statistics, cats, tags, archives] = await Promise.all([
        fetchArticlesByUser(queryUser, page),
        fetchHottestArticles(10),
        fetchBlogStatistics(),
        fetchCatList(),
        fetchTagsList(),
        fetchArchiveList()
      ])
      const result = {
        articles: articleObj.articles.map(function(item){item.archiveTime = item.archiveTime.substr(0, 10);  return item;}),
        ...statistics,
        hotterArticles,
        categories: cats,
        breadcrumb: ['作者', queryUser],
        pageUrl: '/blog/user/' + queryUser + '/page',
        currentPage: page,
        pageNum: Math.ceil(articleObj.totalQueryArticles[0].articles.length/5),
        tags,
        archives
      }
      return res.view(
        'articleLists',
        result
      );
    }catch(err){
      console.error('crash occur at showOneUser: ', page, queryUser);
      console.error('error code: ', err);
      return res.send('获取文章作者失败,请联系管理员。');
    }
  },

  showSearch: function(req, res){
    var query = req.param('query');

    if(query !== ''){
      Article.find({title:{'contains': query}}).exec(function(err, results){
        return res.json(200, {data: results, err: err})
      });
    }else{

    }
  },

  aboutSite: async function (req, res){

    const [hotterArticles, statistics, cats, tags, archives] = await Promise.all([
      fetchHottestArticles(10),
      fetchBlogStatistics(),
      fetchCatList(),
      fetchTagsList(),
      fetchArchiveList()
    ])

    return res.view('aboutSite', {
      breadcrumb: ['关于本站'],
      categories: cats,
      tags: tags,
      archives: archives,
      hotterArticles,
      ...statistics,
      changeLogs: websiteChangelog()
    })
  }
};
