var Components = {};
(function(){
  var React = window.React;
  var $ = window.$;
  
  // useful in all pages
  $(document).on('shown.bs.modal', '.modal', function() {
    if($(this).find('input').length > 0)
      $(this).find('input')[0].focus();
  });
  
  var Poll = React.createClass({
    getInitialState: function(){
      return {
        data: this.props.data, 
        chart: null,
        baseURL: this.props.baseURL
      }
    },
    handleVoteSubmit: function(e){
      var poll = this;
      var target = e.target;
      $("#poll" + this.state.data._id).find('input[name="vote"]:checked').prop('disabled', true).parents('label').removeClass('option')
      $("#poll" + this.state.data._id).find('input[name="vote"]:not(:checked)').prop('disabled', false).parents('label').addClass('option')
      $(target).prop('disabled', true).text('...')
      $.post(this.state.baseURL + '/api/vote', $(target).parent().find('#form' + this.state.data._id).serialize(), function(resp){
        poll.setState({data: resp.data, chart: poll.state.chart}, function(){
          $(target).prop('disabled', false).text('Change Vote')
          poll.resetChart();
        })
      })
    },
    submitNewOption: function(e){
      var poll = this;
      var target = e.target;
      e.preventDefault()
      $.post(this.state.baseURL + '/api/addNewOption', $(target).parents('form').serialize(), function(resp){
        poll.setState({data: resp.data, chart: poll.state.chart}, function(){
          $(target).parents('form').find('#'+resp.data.id+resp.option).prop('checked', true)
          poll.resetChart()
        })
      })
    },
    activateChart: function(){
      var Chart = window.Chart;
      var $ = window.$;
      var ctx = $('#chart' + this.state.data._id + this.props.identifier)[0].getContext('2d');
      var colours = ['#1976D2', '#FBC02D', '#388E3C', '#d32f2f', '#7B1FA2', '#00796B', '#795548', '#E91E63', '#FF5722', '#607D8B'].reverse()
      var highlightColours = ['#42A5F5', '#FFEE58', '#66BB6A', '#ef5350', '#AB47BC', '#26A69A', '#8D6E63', '#EC407A', '#FF7043', '#78909C'].reverse()
      var chart = new Chart(ctx).Doughnut(this.state.data.options.map(function(option){
        return {
          label: option.name,
          value: option.votes,
          color: colours.pop(),
          highlight: highlightColours.pop()
        }
      }), {animationEasing: "easeOutQuart", legendTemplate : "<% for (var i=0; i<segments.length; i++){%><span class=\"legendKey\"><span class=\"colour\" style=\"background-color:<%=segments[i].fillColor%>\"></span><%if(segments[i].label){%><%=segments[i].label%></span><%}%><span>&nbsp;&nbsp;&nbsp;</span><%}%></span>"})
      $('#chartLegend' + this.state.data._id + this.props.identifier).append(chart.generateLegend())
      this.setState({data: this.state.data, chart: chart})
    },
    resetChart: function(){
      this.state.chart.destroy();
      $('#chartLegend' + this.state.data._id + this.props.identifier).empty()
      this.activateChart();
    },
    checkHistory: function(key, identifier){
      for(var i in this.state.data.voted){
        if(this.state.data.voted[i][key] === identifier){
          return this.state.data.voted[i].option;
        }
      }
      return false
    },
    componentDidMount: function() {
      var $ = window.$;
      var option;
      if(window.user){
        option = this.checkHistory('user', window.user._id)
      }
      else{
        option = this.checkHistory('ip', window.ip)
      }
      if(option)
        $('#poll'+this.state.data._id).find('input[value="'+option+'"]').prop('checked', true)
      this.activateChart();
    },
    render: function(){
      var poll = this;
      var data = this.state.data;
      var baseURL = this.state.baseURL;
      var sortedData = JSON.parse(JSON.stringify(data));
      return(
        React.DOM.div({className: "poll", id: "poll" + data._id}, 
          React.DOM.div({className: 'col-sm-6'},
            React.DOM.h4({className: 'pollQuestion'}, data.question),
            React.DOM.form({id:"form" + data._id},
              sortedData.options.sort(function(option1, option2){
                return option2.votes - option1.votes;
              }).map(function(option){
                return (
                  React.DOM.label({htmlFor: data._id+option._id+poll.props.identifier, key: option._id, className: "option"},
                    React.DOM.div({className: "input-group"},
                      React.DOM.span({className: "input-group-addon"},
                        React.DOM.input({type: "radio", name:"option", value: option.name, id: data._id+option._id+poll.props.identifier})
                      ),
                      React.DOM.span({className: "form-control"}, option.name)
                    )
                  )
                )
              }),
              React.DOM.input({type: "hidden", name:"poll", value: data._id})
            ),
            (function(){
              if(window.user){
                return(
                  React.DOM.div({style:{display: "inline-block"}},
                    React.DOM.button({className:"btn btn-default", "data-toggle":"modal", "data-target":"#addOptionModal"+data._id}, "Add New Option"),
                    React.DOM.div({className:"modal fade", id:"addOptionModal"+data._id},
                      React.DOM.div({className:"modal-dialog modal-sm"}, React.DOM.div({className:"modal-content"},
                        React.DOM.div({className:"modal-header"},
                          React.DOM.button({className:"close", "data-dismiss":"modal"}, "X"),
                          React.DOM.h4({className:"modal-title"}, "Add New Option")
                        ),
                        React.DOM.form({method: "POST"},
                          React.DOM.div({className:"modal-body"},
                            React.DOM.div({className:"form-group"},
                              React.DOM.label({htmlFor: "newOption" + data._id}, "New Option:"),
                              React.DOM.input({id:"newOption"+data._id, name:"option", type: "text", className:"form-control", placeholder:"New Option Here"})
                            ),
                            React.DOM.input({type:"hidden", name:"poll", value:data._id})
                          ),
                          React.DOM.div({className:"modal-footer"},
                            React.DOM.button({className:"btn btn-success pull-left", onClick:poll.submitNewOption, "data-dismiss":"modal"}, "Submit Option"),
                            React.DOM.button({className:"btn btn-default pull-right", "data-dismiss":"modal"}, "Close")
                          )
                        )
                      ))
                    )
                  )
                )
              }
            }()),
            (function(){
              var alreadyVoted = React.DOM.button({name: 'submitVote', className: 'btn btn-info', onClick:poll.handleVoteSubmit}, "Change Vote")
              var haventVoted = React.DOM.button({name: 'submitVote', className: 'btn btn-success', onClick: poll.handleVoteSubmit}, "Submit Vote")
              if(window.user){
                return poll.checkHistory('user', window.user._id) ? alreadyVoted : haventVoted
              }
              else{
                return poll.checkHistory('ip', window.ip) ? alreadyVoted : haventVoted
              }
            }()),
            React.DOM.p({className: 'small'},"(ID: "+data._id+")")
          ),
          React.DOM.div({className: 'col-sm-6'},
            React.DOM.div({className: "fb-share-button", "data-href": "http://www.intrepify.com" + baseURL + "/viewPoll?id=" + data._id, "data-layout": "button_count"}),
            React.DOM.canvas({className: "chart", id: "chart" + data._id + poll.props.identifier, width: "250", height: "250"}),
            React.DOM.div({className: "chartLegend", id:"chartLegend" + data._id + poll.props.identifier}),
            (function(){
              if(window.user && window.user._id === data.author){
                return(
                React.DOM.div({className:"text-center"},
                  React.DOM.h4(null, "Poll Owner Menu:"),
                  React.DOM.button({className:"btn btn-warning", "data-toggle":"modal", "data-target":"#modifyPollModal"+data._id}, "Modify Poll"),
                  React.DOM.div({className:"modal fade", id:"modifyPollModal"+data._id},
                    React.DOM.div({className:"modal-dialog"}, React.DOM.div({className:"modal-content"},
                      React.DOM.div({className:"modal-header"},
                        React.DOM.button({className:"close", "data-dismiss":"modal"}, "X"),
                        React.DOM.h4({className:"modal-title"}, "Modify Poll")
                      ),
                      React.DOM.form({action:"/api/modifyPoll", method:"post"},
                        React.DOM.input({type: "hidden", value: data._id, name: "poll"}),
                        React.DOM.div({className:"modal-body"},
                          React.DOM.div({className:"form-group"}, 
                            React.DOM.label({htmlFor:"#questionInput"}, "Question:"),
                            React.DOM.input({
                              name:"question", 
                              defaultValue: data.question,
                              id:"questionInput", 
                              className:"form-control", 
                              placeholder:"e.g. What is your favourite colour?"
                            })
                          ),
                          React.DOM.div({className:"form-group", id:"optionsInputContainer"}, 
                            React.DOM.label({htmlFor:"#optionsInput1"}, "Options:"),
                            data.options.map(function(option, index){
                              return React.DOM.input({
                                key: index,
                                name:"options[]", 
                                id:"optionsInput" + (index + 1), 
                                className:"form-control", 
                                placeholder:"e.g. Red",
                                defaultValue: option.name,
                                onChange: function(e){
                                  var id = $(e.target).attr('id')
                                  var index = parseInt(id.slice('optionsInput'.length, id.length)) - 1;
                                  var newVal = $(e.target).val()
                                  data.options[index].name = newVal;
                                  if(data.options.length >= index + 2){ //if another element already exists after this one
                                    if(newVal === ""){
                                      if(data.options[index + 1].name === ""){
                                        data.options.splice(index+1, 1)
                                      }
                                    }
                                  }
                                  poll.setState({data: data, chart: poll.state.chart})
                                }
                              })
                            })
                          )
                        ),
                        React.DOM.div({className:"modal-footer"},
                          React.DOM.p({className:"text-center text-danger lead"}, "Warning: This will remove any existing votes on this poll"),
                          React.DOM.button({className:"btn btn-warning pull-left", "data-dismiss": "modal", onClick: function(e){
                            e.preventDefault();
                            $.post(baseURL + '/api/modifyPoll', $(e.target).parents('form').serialize(), function(data){
                              poll.setState({data: data, chart: poll.state.chart}, function(){
                                poll.resetChart();
                              })
                            })
                          }}, "Submit Modifications"),
                          React.DOM.button({"data-dismiss":"modal", className:"btn btn-default pull-right"}, "Close")
                        )
                      )
                    ))
                  ),
                  React.DOM.button({className:"btn btn-danger", "data-toggle":"modal", "data-target":"#deletePollModal"+data._id}, "Delete Poll"),
                  React.DOM.div({className:"modal fade", id:"deletePollModal"+data._id},
                    React.DOM.div({className:"modal-dialog modal-sm"}, React.DOM.div({className:"modal-content"},
                      React.DOM.div({className:"modal-header"},
                        React.DOM.button({className:"close", "data-dismiss":"modal"}, "X"),
                        React.DOM.h4({className:"modal-title"}, "Delete Poll?")
                      ),
                      React.DOM.form({method: "POST", action: baseURL + "/api/deletePoll"},
                        React.DOM.div({className:"modal-body"},
                          React.DOM.label(null, "Are you sure you want to delete this poll? This cannot be undone."),
                          React.DOM.input({type:"hidden", value: data._id, name:"poll"})
                        ),
                        React.DOM.div({className: "modal-footer"},
                          React.DOM.button({type:"submit", className:"btn btn-danger pull-left"}, "Confirm Delete"),
                          React.DOM.button({className:"btn btn-default pull-right", "data-dismiss":"modal"}, "Close")
                        )
                      )
                    ))
                  )
                ))
              }
            }())
          )
        )
      )
    }
  })
  Components.Poll = React.createFactory(Poll);
  
  var PollList = React.createClass({
    getInitialState: function(){
      return {
        url: this.props.url,
        baseURL: this.props.baseURL,
        polls: []
      }
    },
    componentDidMount: function(){
      var $ = window.$;
      var pollList = this;
      $.getJSON(this.state.baseURL + this.state.url, function(polls){
        pollList.setState({
          url: pollList.state.url,
          polls: polls
        }, function(){
          $('.in').removeClass('in'); // required to correctly display canvas within collapsible element
        })
      })
    },
    render: function(){
      var url = this.state.url.match(/.*\/(.*)?$/)[1];
      var baseURL = this.state.baseURL;
      return (
        React.DOM.div({className:"panel-group", id:"pollList"+url},
          this.state.polls.map(function(poll){
            return (
              React.DOM.div({className:"panel panel-primary", key: poll._id},
                React.DOM.a({"data-toggle":"collapse", "data-parent":"#pollList"+url, href:"#pollPanel" + poll._id + url, className: "panel-primary"},
                  React.DOM.div({className:"panel-heading"},
                    React.DOM.h4({className:"panel-title"},
                      poll.question,
                      React.DOM.span({className: 'pull-right'}, poll.totalVotes + " votes")
                    )
                  )
                ),
                React.DOM.div({id:"pollPanel" + poll._id + url, className:"panel-collapse collapse in"},
                  React.DOM.div({className:"panel-body"},
                    Components.Poll({data: poll, identifier: url, baseURL: baseURL})
                  )
                )
              )
            )
          })
        )
      )
    }
  })
  Components.PollList = React.createFactory(PollList);
  
  var PollMaker = React.createClass({
    getInitialState: function(){
      return {
        question: "",
        options: [{
          name: ""
        }],
        baseURL: this.props.baseURL
      };
    },
    handleOptionChange: function(e){
      var id = $(e.target).attr('id')
      var index = parseInt(id.slice('optionsInput'.length, id.length)) - 1
      var options = this.state.options;
      var newVal = $(e.target).val()
      options[index].name = newVal;
      if(options.length >= index + 2){ //if another element already exists after this one
        if(newVal === ""){
          if(options[index + 1].name === ""){
            options.splice(index+1, 1)
          }
        }
      }
      else if(newVal !== ""){
        options.push({
          name: ""
        })
      }
      this.setState({
        question: this.state.question,
        options: options
      })
    },
    render: function(){
      var pollMaker = this;
      return(
        React.DOM.form({action:this.state.baseURL + "/api/newPoll", method:"post"},
          React.DOM.div({className:"modal-body"},
            React.DOM.div({className:"form-group"}, 
              React.DOM.label({htmlFor:"#questionInput"}, "Question:"),
              React.DOM.input({
                name:"question", 
                id:"questionInput", 
                className:"form-control", 
                placeholder:"e.g. What is your favourite colour?"
              })
            ),
            React.DOM.div({className:"form-group", id:"optionsInputContainer"}, 
              React.DOM.label({htmlFor:"#optionsInput1"}, "Options:"),
              this.state.options.map(function(option, index){
                return React.DOM.input({
                  key: index,
                  name:"options[]", 
                  id:"optionsInput" + (index + 1), 
                  className:"form-control", 
                  placeholder:"e.g. Red", 
                  onChange: pollMaker.handleOptionChange
                })
              })
            )
          ),
          React.DOM.div({className:"modal-footer"},
            React.DOM.input({type:"submit", className:"btn btn-success pull-left"}),
            React.DOM.button({"data-dismiss":"modal", className:"btn btn-default pull-right"}, "Close")
          )
        )
      )
    }
  })
  Components.PollMaker = React.createFactory(PollMaker);
}())