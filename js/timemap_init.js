var tm;
var lookup;
var countries = {};
var filters = [];
var cm = {}; //countryMarkers
var icons = [];
// generate a series of numbered icons.
for (var i=1;i<80;i++) {icons[i] = generateIcon(i);}
//generate an array of GLatLng`s
for (cc in lookup) {
	cm[cc] = {};
	cm[cc].latlng = new GLatLng(lookup[cc].lat, lookup[cc].lon);
	cm[cc].marker = null;
	cm[cc].items = [];
	cm[cc].urls = [];
	cm[cc].name = null;
}
lookup = null;

$(function(){

  var height = $(window).height();
  $('#mapcontainer').css('height', (height - 50) * .6 + 'px');
  $('#timelinecontainer').css('height', (height - 50) * .4 + 'px');

  $(window).resize(function(){
    var height = $(window).height();
    $('#mapcontainer').css('height', (height - 50) * .6 + 'px');
    $('#timelinecontainer').css('height', (height - 50) * .4 + 'px');
  });

  tm = TimeMap.init({
    mapId: "map",
    timelineId: "timeline",
    scrollTo: 'now',
    options: {
		  mapType: 'normal',
		  mapCenter: new GLatLng(30,18),
		  centerMapOnItems: false,
		  mapZoom: 2
    },
    datasets: [{
      id: "bloggers",
      title: "Bloggers",
  		type: "jsonp",
      options: {
        url: "http://threatened.globalvoicesonline.org/data/items.json&callback=",
        preloadFunction: function(result) {return result.items;}
      }
    }],
    bandIntervals: [
      Timeline.DateTime.MONTH,
      Timeline.DateTime.YEAR
    ],

    dataDisplayedFunction: function(tm) {
      tm.map.setZoom(2);

      tm.addFilterChain("counter",
        function(item) {
          var cc = item.opts.cc;
          if (isNaN(countries[cc])) {
            countries[cc] = 1;
          }
          else {
            countries[cc]++;
          }

          // just in case the country code is not in cc.js
    			if (typeof(cm[cc]) != "undefined") {
    		    var index = cm[cc].items.indexOf(item.getTitle());

            if (!cm[cc].name)
    					cm[cc].name = item.opts.c;

            if (index == -1) {
              cm[cc].items.push(item.getTitle());
    		  		cm[cc].urls.push(item.opts.url);}
    				}
        },
        function(item) {}
      );

      tm.addFilter("counter", function(item) {
        return TimeMap.filters.hideFuture(item);
      });

      // invoke the filter once data is displayed
      tm.filter("counter");

      if (!filters.length) {//show 'All'
          for (cc in countries) {
              if (countries[cc] > 0) {
                dynamicSizeMarker(cc, countries[cc]);
              }
          }
      }

      updateTimeframe(tm.timeline.getBand(0));

      $('.timeline-message-container').hide();

      // update map on timeline scroll
      tm.timeline.getBand(0).addOnScrollListener(function() {
      	updateTimeframe(tm.timeline.getBand(0));
        countries = {};
        tm.filter("counter");
        if (!filters.length) {//show 'All'
          for (cc in cm) {
          	if (countries[cc] > 0) {
        			dynamicSizeMarker(cc, countries[cc]);
        		}
        		else if (cm[cc].marker) {
        			tm.map.removeOverlay(cm[cc].marker);
          		cm[cc].marker = null;
            }
          }
        }
      });
    }
  });

  tm.addFilter("map", TimeMap.filters.hasSelectedTag); // hide map markers on fail
  tm.addFilter("timeline", TimeMap.filters.hasSelectedTag); // hide timeline events on fail
  tm.addFilter("map", TimeMap.filters.showAll);

  $('#tm-all').attr('checked', true);
  $("#tmfilters input[type=checkbox]:not('#tm-all')").each(function() {
    $(this).attr('checked', false);
  });
  // TODO rework the logic.
  $("#tmfilters input[type=checkbox]").click(function(){
    var val = $(this).val();
    var index = filters.indexOf(val);
    var el = $(this);
    if (el.is(':checked')) {
      if (val == "All") {
        filters = [];

        $("#tmfilters input[type=checkbox]:not('#tm-all')").each(function() {
            $(this).attr('checked', false);
        });
      }
      else {
        var _all = $('#tm-all');
        if (_all.is(':checked')) {
          _all.attr('checked', false);
        }
        removeSizeMarkers();

        if (index == -1) {
          filters.push(val);

          tm.filter('timeline');
          tm.timeline.layout();

          tm.datasets.bloggers.each( function(item) {
            for (_filter in filters) {
              if (item.opts.tags.indexOf(filters[_filter]) != -1) {
                item.showPlacemark();
                item.visible = true;
              }
            }
          });

        return;
        }
      }
    } // element is not checked
    else {
      if (index != -1) {
        filters.splice(index, 1);
      }
    }

    tm.filter('map');tm.filter('timeline');tm.timeline.layout();
  });

  var d = new Date();
  $('#tm-nav button').click(function() {
    var when = $(this).attr('title');

    if (when == "earliest") {
      tm.timeline.getBand(0).setCenterVisibleDate(tm.eventSource.getEarliestDate());
    }
    else if (when == "latest") {
      tm.timeline.getBand(0).setCenterVisibleDate(tm.eventSource.getLatestDate());
    }
    else { //scroll to now
      tm.timeline.getBand(0).setCenterVisibleDate(d);
    }

    return false;
  });

});

TimeMap.filters.hideFuture = function(item) {
    var topband = item.dataset.timemap.timeline.getBand(0);
    var maxVisibleDate = topband.getMaxVisibleDate().getTime();
    if (item.event !== null) {
        var itemStart = item.event.getStart().getTime();
        if (itemStart > maxVisibleDate) {
        	  var index = cm[item.opts.cc].items.indexOf(item.getTitle());
        	  if (index != -1) {
            	  cm[item.opts.cc].items.splice(index,1);
            	  cm[item.opts.cc].urls.splice(index,1);
        	  }
            return false;
        }
    }
    return true;
};

TimeMap.filters.hasSelectedTag = function(item) {
	if (!filters.length) {
		return true;
	}
	if (item.opts.tags) {
		return (filters.indexOf(item.opts.tags) >= 0);
	}
return false;
};

TimeMap.filters.showAll = function(item) {
	if (!filters.length) {
		return false;
	};
return true;
}


function generateIcon(count) {
var iconSize = Math.round(((count - 1)*64)/80 + 16),
    opts = {};

  opts.width = iconSize;
  opts.height = iconSize;
  opts.primaryColor = "#ff0000";
  opts.label = String(count);
  opts.labelSize = 12;
  opts.labelColor = "#1f1f1f";
  opts.shape = "circle";

return MapIconMaker.createFlatIcon(opts);
}

function dynamicSizeMarker(cc, count) {
	if (typeof(cm[cc]) == "undefined")
	 return;

	if (cm[cc].marker) {
		tm.map.removeOverlay(cm[cc].marker);
  }

	cm[cc].marker = new GMarker(cm[cc].latlng, {icon: icons[count]});

  GEvent.addListener(cm[cc].marker, "click", function() {
		cm[cc].marker.openInfoWindowHtml(htmlList(cm[cc].items, cm[cc].urls, cc));
	});

	tm.map.addOverlay(cm[cc].marker);
}

function htmlList(keys, urls, cc) {
	var html = '<div class="infodescription list">';
	html += '<span class="'+ cc +'"><img src="./sites/all/themes/gv/images/flags/'+cc.toLowerCase()+'.gif"> <a href="bloggers/'+ cm[cc].name +'">'+ cm[cc].name +'</a></span>';
	for (var i=0; i<keys.length;i++) {
		html += '<a href="' + urls[i] + '">' + keys[i] + '</a><br/>';
	}
	return html+'</div>';
}

/**
 *
 * TODO add var to skip repetitive removal
 */
function removeSizeMarkers(){
	for (cc in cm) {
		if (cm[cc].marker) {
			tm.map.removeOverlay(cm[cc].marker);
			cm[cc].marker = null;
		}
	}
}

function updateTimeframe(bandObj) {
	var min = new String(bandObj.getMinVisibleDate()).split(/\s/);
	var max = new String(bandObj.getMaxVisibleDate()).split(/\s/);
	min = min[1] + ' ' + (!$.browser.msie ? min[3] : min[min.length-1]);
	max = max[1] + ' ' + (!$.browser.msie ? max[3] : max[max.length-1]);

	$("#timeframe").html(min + ' - ' + max);
	min = max = null;
}

if (typeof(Array.indexOf) == "undefined"){Array.prototype.indexOf = function( v, b, s ) {for( var i = +b || 0, l = this.length; i < l; i++ ) {if( this[i]===v || s && this[i]==v ) { return i; }}return -1;};}
