Router.route('/', {
    name: 'home',
    template: 'home',
});

Router.route('/tests')
Router.route('/dashboard')
Router.route('/test/:_id',{
  name:"testOverview",
  //  UNLOCK THIS WHEN REMOVING AUTO-PUBLISH
  waitOn: function(){
    return Meteor.subscribe('Meta',this.params._id);
  },
  data: function(){
    return Tests.findOne({"_id":this.params._id});
  },
  action: function() {
    this.render();
  }
})

Router.route("/test/:_id/charts",{
  name:"charts",
  loadingTemplate: 'loading',
  // UNLOCK THIS WHEN REMOVING AUTO-PUBLISH
  waitOn: function(){
    return [Meteor.subscribe('Test',this.params._id),Meteor.subscribe('Meta',this.params._id)];
  },
  data: function(){
    return Tests.findOne({"_id":this.params._id});
  },
  action: function() {
      this.render('charts');
  }
});

Router.route('/loading')

Router.configure({
    loadingTemplate: 'loading',
    layoutTemplate: 'layout'
});
