/* TODO 
	* Draw a stack bar chart
	** draw x and y axis (done)
	** read data and handle null values (done)
	*** 74 schools with no aid data (done)
	**** remove them: 992 rows remain (done)
	*** Some schools with parts of data missing 
	**** wherever there is a null preceded by zero then insert zero
	* Make it interactive
	* handle the 74 schools that were removed earlier
	* brushing (done)
	* sorting (done. first attempt)
	* filtering
	** changing the opacity of the filtered out elements
	** cascade to detailed view
	** do filters OR or AND
	* details on demand
	** add a click event trigger and pull "d" from there (done)
	** modify showDetailsOnClick(d) to parse the strings
	*** give proper names to labels. For example, average_amount_any_personal_contribution -> Personal Contribution
	*** add units to values and round off decimal values. For example, $ to monetary
	*** the bar that is selected should be highlighted unless anything else is clicked
	* show labels
	** in case of states show state names
	* when brushed highlight the states
	* 5 levels of intensity for states, where each level corresponds to number of case (0-5, 5-10,...)
	* display count of cases selected/filtered
	* show details on demand for atleast one value by default

	
	Known Bugs
	* in case of twodown and heighest data values, bottom bars get cut (done)
	* on refreshing the page the map resets only half the time (done)
	* on sorting the filter becomes ineffective but the selection of filter remains intact (done)
	* on filtering and sorting the brush resets
	* Puerto Rico is missing from the map but there are cases for that.
	* Jitter in the values on sorting.
	
*/
	
		$(document).ready(function() {
			
			
			
			var cmargin = {top: 20, right: 10, bottom: 20, left: 40},
			fmargin = {top: 20, right: 10, bottom: 220, left: 40},
			cwidth = 1060 - cmargin.left - cmargin.right, //width=# of rows in csv
			fwidth = 343 - fmargin.left - fmargin.right,
			cheight = 200 - cmargin.top - cmargin.bottom,
			fheight = 453 - fmargin.top - fmargin.bottom;
	
			var cx = d3.scale.ordinal().rangeRoundBands([0, cwidth], .1),
			fx = d3.scale.ordinal().rangeRoundBands([0, fwidth], .1),
			cy = d3.scale.linear().range([cheight, 0]).nice(),
			fy = d3.scale.linear().range([fheight, 0]);
			
			var cxAxis = d3.svg.axis()
			.scale(cx)
			.orient("bottom")
			.tickFormat(function(d){return "";});
		
			var fxAxis = d3.svg.axis()
			.scale(fx)
			.orient("bottom")
			.tickFormat(function(d){return "";});

			var cyAxis = d3.svg.axis()
			.scale(cy)
			.orient("left")
			.tickFormat(function(d) { return Math.round(d / 1e3) + "K"; })
			.ticks(7);
									
			var fyAxis = d3.svg.axis()
			.scale(fy)
			.orient("left")
			.tickFormat(function(d) { return Math.round(d / 1e3) + "K"; });
	
			// An SVG element with a top-left origin .
			// var svg = d3.select("body").append("svg")
			// .attr("width", cwidth + cmargin.left + cmargin.right)
			// .attr("height",fheight + fmargin.top + fmargin.bottom+100)
	
			var context = d3.select("div.context").append("svg")
			.attr("id", "context-svg")
			.attr("width", cwidth + cmargin.left + cmargin.right)
			.attr("height",cheight + cmargin.top + cmargin.bottom).append("g")
			.attr("id", "context")
			.attr("transform", "translate(" + cmargin.left + "," + cmargin.top + ")");
				
			var focus = d3.select("div.focus").append("svg")
			.attr("width", fwidth + fmargin.left + fmargin.right)
			.attr("height",fheight + fmargin.top + fmargin.bottom).append("g")
			.attr("id","focus")
			.attr("transform", "translate(" + fmargin.left + "," + fmargin.top + ")");
	
			var legend = d3.select("div#legend").append("svg").attr("height",60);
	
			var color = d3.scale.ordinal()
			.range(["E6550D", "FDAE6B", "FEE6CE"]);//["#1f77b4","#ff7f0e","#2ca02c"]);
			
			//Filter UI variables
			var debtRange =[];
			var coaRange = [];
			
			//Filter logic variables
			var controlFilter = "";
			var urbanFilter = "";
			var sizeFilter = [];
			var stateFilter = "";
			var debtFilter = [];
			var coaFilter = [];
			
			var filteredIDs = [];
			
			var lastActionSort = false;
			
			//Focus modes
			var ALLUP = 0;
			var ONEDOWN = 1;
			var TWODOWN = 2;
			
			var isStateSelected = false;
			var selectedState = "";
			
			//Sort types
			var STATE = 0;
			var SIZE = 1
			var DEBT = 2;
			var GRANT = 3;
			var COA = 4;
			
			var HEADER_NAME_MAP = {"average_amount_any_loan_aid":"Avg. Loan", 
														"average_amount_personal_contribution":"Avg. Personal Contribution", 
														"average_amount_any_grant_aid": "Avg. Grant",
														"average_coa": "Avg. COA",
														"control": "Control Type",
														"degree_urbanization": "Degree Urbanization",
														"size_category": "Size",
														"debt" : "Avg. Debt",
														"state" : "State"};
													var trueValues = ["n/a", "Under 1,000", "1,000 - 4,999", "5,000 - 9,999", "10,000 - 19,999", "20,000 & above"];
			var SIZE_CATEGORY_MAP = {"n/a": "Not reported",
																"Under 1,000" : "Under 1-000",
																"1,000 - 4,999" : "1-000 - 4-999",
																"5,000 - 9,999" : "5-000 - 9-999",
																"10,000 - 19,999" : "10-000 - 19-999",
																"20,000 & above" : "20-000 and above"
															}; 
															var SIZE_CATEGORY_ARR = ["Not reported",
																												"Under 1-000",
																												"1-000 - 4-999",
																												"5-000 - 9-999",
																												"10-000 - 19-999",
																												"20-000 and above"
																												];
			
			var focusMode = TWODOWN;
			var sortType = COA;
			
			var cData = [], fData = [], filteredData = [];
			
			var width = 702,
			    height = 499;
			
			var projection = d3.geo.albersUsa()
			    .scale(width)
			    .translate([width / 2, height / 2]);

			var path = d3.geo.path()
			    .projection(projection);
			
			var states = d3.select("div.states").append("svg")
			.attr("width", width)
			.attr("height",height)
			.append("g")
			.attr("id", "states");

			d3.json("assets/us-states.json", function(error, json) {
								  states.selectAll("path")
								      .data(json.features)
								    .enter().append("path")
								      .attr("d", path)
											.attr("data-state", function(d) {return d.properties.name;})
											.on("click", onStateClick)
											.append("title").text(function(d) {return d.properties.name;});
											
								});
			
			function onStateClick(d) {
				var stateName = d.properties.name;
				
				if(!isStateSelected) {
					//No state is selected
					d3.select(this).style("fill", "#E6550D");
					selectedState = stateName;
					isStateSelected = true;
					
					stateFilter = d.properties.name;
					drawContext(cData);
				} else {
					//If a state is selected already
					//check if the same state is clicked again
					if(selectedState == stateName){
						//Toggle
						$('.states path[data-state="'+selectedState+'"]').css("fill", "");
						isStateSelected = false;
						selectedState = "";
						stateFilter = "All"; 
						drawContext(cData);
					} else {
						//A new state is selected
						$('.states path[data-state="'+selectedState+'"]').css("fill", "");
						d3.select(this).style("fill", "#E6550D");
						selectedState = stateName;
						isStateSelected = true;
					
						stateFilter = d.properties.name;
						drawContext(cData);
					}
				}
			}
			
			function highlightCasesOnStateHover(d) {
				stateFilter = d.properties.name;
				drawContext(cData);
			}
			
			function highlightStates (fData) {
				//Reset color for all states
				states.selectAll("path").style("fill", "#aaa").style("fill-opacity",1);
				var stateCount = [];
				
				$.each(fData, function(key, value){
					//Initialize else NaN appears
					if(stateCount[value.state] == null) {
						stateCount[value.state] = 0;
					}
					//Increment the count
					stateCount[value.state] += 1 ;
				});
				
				$.each(fData, function(key, value){
					$('.states path[data-state="'+value.state+'"]').css("fill", "red").css("fill-opacity", 0.2*(Math.ceil(stateCount[value.state]/5)));
				});
				
				
				//pick the states
			}
			
			d3.csv("merged_files_less_schools.csv", function(error,csvData) {
				color.domain(["average_amount_any_loan_aid", "average_amount_personal_contribution", "average_amount_any_grant_aid"]);
				
				// Convert strings to numbers.
				csvData.forEach(function(d, i) {
					if(d.average_amount_any_loan_aid == "") {
						d.average_amount_any_loan_aid = +0;
					}
					d.average_amount_any_loan_aid = Math.floor(+d.average_amount_any_loan_aid);
					if(d.average_amount_any_grant_aid == "") {
						d.average_amount_any_grant_aid = +0;
					}
					d.average_amount_any_grant_aid = Math.floor(+d.average_amount_any_grant_aid);
					if(d.average_amount_personal_contribution == "") {
						d.average_amount_personal_contribution = +0;
					}
					d.average_amount_personal_contribution = Math.floor(+d.average_amount_personal_contribution);
					
					/*
					** Since our calculated average_amount_personal_contribution could be negative we have to make adjustments.
					** - If it is negative subtract the extra amount from loan aid (assuming a smart person would do that)
					** - Make the personal contribution = 0
					*/
					if(d.average_amount_personal_contribution < 0) {
						d.average_amount_any_loan_aid -= d.average_amount_personal_contribution;
						d.average_amount_personal_contribution = 0;
					}
					
					var y0 = 0;
					d.amounts = color.domain().map(function(name) { return {name: name, y0: y0, y1: y0 += +d[name]}});
					d.total = d.amounts[d.amounts.length - 1].y1;
					d.debt = d.average_amount_any_loan_aid + d.average_amount_personal_contribution;
				});
								
				debtRange = d3.extent(csvData, function(d) { return d.debt;});	
				coaRange = d3.extent(csvData, function(d) { return d.total;});
				cData = csvData;
				// Initializing the filters
				controlFilter = "All";
				sizeFilter = [0,5];
				urbanFilter = "All";
				stateFilter = "All";
				debtFilter[0] = debtRange[0];
				debtFilter[1] = debtRange[1];
				coaFilter[0] = coaRange[0];
				coaFilter[1] = coaRange[1];
				
				//This piece of code to setup sliders occurs here in order force it to use values of debtRange
				//and coaRange
				$( "#debt-range-slider" ).slider({
				            range: true,
				            min: debtRange[0],
				            max: debtRange[1],
				            values: debtRange,
				            slide: function( event, ui ) {
				                $( "#debt-range" ).text( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
												// var filtered = context.selectAll(".context-bar").filter(function(d, i) {
												// 	return (d["debt"] > ui.values[ 0 ] && d["debt"] < ui.values[ 1 ]); });

													
				            },
										change: function(event, ui) {
											if(debtFilter[0] != ui.values[ 0 ] || debtFilter[1] != ui.values[ 1 ]){
												debtFilter[0] = ui.values[ 0 ];
												debtFilter[1] = ui.values[ 1 ];
												drawContext(cData);
											}
										}
				        });
				        $( "#debt-range" ).text( "$" + $( "#debt-range-slider" ).slider( "values", 0 ) +
				            " - $" + $( "#debt-range-slider" ).slider( "values", 1 ) );
				
				
				$( "#coa-range-slider" ).slider({
				            range: true,
				            min: coaRange[0],
				            max: coaRange[1],
				            values: coaRange,
				            slide: function( event, ui ) {
				                $( "#coa-range" ).text( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
												// var filtered = context.selectAll(".context-bar").filter(function(d, i) {
												// 													return (d["total"] > ui.values[ 0 ] && d["total"] < ui.values[ 1 ]); });
												
				            },
										change: function(event, ui) {
											if(coaFilter[0] != ui.values[0] || coaFilter[1] != ui.values[1]) {
											coaFilter[0] = ui.values[ 0 ];
											coaFilter[1] = ui.values[ 1 ];
											drawContext(cData);
										}
											
										}
				        });
				        $( "#coa-range" ).text( "$" + $( "#coa-range-slider" ).slider( "values", 0 ) +
				            " - $" + $( "#coa-range-slider" ).slider( "values", 1 ) );
										
								    var trueValues = ["n/a", "Under 1,000", "1,000 - 4,999", "5,000 - 9,999", "10,000 - 19,999", "20,000 & above"];
								    var values =     [0,   1,   2,    3,    4,    5];
								    var slider = $("#size-range-slider").slider({
								        range: true,
								        min: 0,
								        max: 5,
								        values: [0, 5],
								        slide: function(event, ui) {
								            var includeLeft = event.keyCode != $.ui.keyCode.RIGHT;
								           								            								            var includeRight = event.keyCode != $.ui.keyCode.LEFT;
								           								            								            var value = findNearest(includeLeft, includeRight, ui.value);
								           								            								            if (ui.value == ui.values[0]) {
								           								            								                slider.slider('values', 0, value);
								           								            								            }
								           								            								            else {
								           								            								                slider.slider('values', 1, value);
								           								            								            }
														
														
														
								            $("#size-range").text(getRealValue(slider.slider('values', 0)) + ' - ' + getRealValue(slider.slider('values', 1)));
								            
								        },
								        change: function(event, ui) { 
													//Since change is called even on clicking a handle when no value has changed
													// I will check if a value has changed
													if(sizeFilter[0] != ui.values[0] || sizeFilter[1] != ui.values[1]) {
														sizeFilter[0] = ui.values[0];
														sizeFilter[1] = ui.values[1];
									            drawContext(cData);
													}
								        }
								    });
										$("#size-range").text(getRealValue(slider.slider('values', 0)) + ' - ' + getRealValue(slider.slider('values', 1)));
								    function findNearest(includeLeft, includeRight, value) {
								        var nearest = null;
								        var diff = null;
								        for (var i = 0; i < values.length; i++) {
								            if ((includeLeft && values[i] <= value) || (includeRight && values[i] >= value)) {
								                var newDiff = Math.abs(value - values[i]);
								                if (diff == null || newDiff < diff) {
								                    nearest = values[i];
								                    diff = newDiff;
								                }
								            }
								        }
								        return nearest;
								    }
								    function getRealValue(sliderValue) {
								        for (var i = 0; i < values.length; i++) {
								            if (values[i] >= sliderValue) {
								                return trueValues[i];
								            }
								        }
								        return 0;
								    }
										
										// var autoCompleteData = new Array();
										// 		var k = 0;
										// 		$.each(cData, function(key, value) {
										// 			autoCompleteData[k]["label"] = value.name;
										// 			autoCompleteData[k]["value"] = value.state;
										// 			k++;
										// 		});
										// 
										// 						        $( "#project" ).autocomplete({
										// 						            minLength: 0,
										// 						            source: autoCompleteData,
										// 						            focus: function( event, ui ) {
										// 						                $( "#project" ).val( ui.item.name );
										// 						                return false;
										// 						            },
										// 						            select: function( event, ui ) {
										// 						                $( "#project" ).val( ui.item.name );
										// 						                $( "#project-id" ).val( ui.item.id );
										// 						                $( "#project-description" ).html( ui.item.state );
										// 						                // $( "#project-icon" ).attr( "src", "images/" + ui.item.icon );
										//  
										// 						                return false;
										// 						            }
										// 						        })
										// 						        .data( "autocomplete" )._renderItem = function( ul, item ) {
										// 						            return $( "<li>" )
										// 						                .data( "item.autocomplete", item )
										// 						                .append( "<a>" + item.name + "<br>" + item.state + "</a>" )
										// 						                .appendTo( ul );
										// 						        };

				csvData = sortData(csvData, sortType);
				
				//cx.domain(csvData.map(function(d) { return d.id; }));
				
				//fx.domain(cx.domain());
				
												
				drawContext(csvData);
				
				//Initialize focus with 20 values
				
			
			});//d3.csv
	
			
	
			function sortData(csvData, sortBy) {
				switch(sortBy) {
					case STATE:
					return csvData.sort(function(a,b) {return (a.state==b.state)? 0 : ((a.state<b.state)? -1:1);});
					break;
					case SIZE:
					return csvData.sort(function(a,b) {return (a.size==b.size)? 0 : ((a.size<b.size)? -1:1);});
					break;
					case DEBT:
					return csvData.sort(function(a,b) {return (a.debt==b.debt)? 0 : ((a.debt<b.debt)? -1:1);});
					break;
					case GRANT:
					return csvData.sort(function(a,b) {return (a.average_amount_any_grant_aid==b.average_amount_any_grant_aid)? 0 : ((a.average_amount_any_grant_aid<b.average_amount_any_grant_aid)? -1:1);});
					break;
					case COA:
					return csvData.sort(function(a,b) {return (a.total==b.total)? 0 : ((a.total<b.total)? -1:1);});
					break;
				}
			}
	
			function drawContext(csvData) {
				context.selectAll("g").remove();
				
				//Sort
				if(lastActionSort) {
					csvData = sortData(csvData, sortType);
					lastActionSort = false;
				}
				
				
				
				//You have to update the domain on sorting
				cx.domain(csvData.map(function(d) { return d.id; }));
				cy.domain([0,d3.max(csvData, function(d) { return d.total; })]);
				fy.domain(cy.domain());
				fx.domain(cx.domain().slice(20,40));
				fData = csvData.slice(20,40);
				
				var legendEnter = legend.selectAll(".legend")
				      .data(color.domain().slice().reverse())
				    .enter().append("g")
				      .attr("class", "legend")
				      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

				  legendEnter.append("rect")
				      .attr("x", cwidth + cmargin.left - 18)
				      .attr("width", 18)
				      .attr("height", 18)
				      .style("fill", color);

				  legendEnter.append("text")
				      .attr("x", cwidth + cmargin.left - 24)
				      .attr("y", 9)
				      .attr("dy", ".35em")
				      .style("text-anchor", "end")
				      .text(function(d) { return HEADER_NAME_MAP[d]; });
				
				var contextChart = context.selectAll("g").data(csvData);
				var brush = d3.svg.brush().x(cx).extent([20,40]).on("brush", brushed);
				var contextChartEnter = context.selectAll("g")
				.data(csvData)
				.enter().append("g")
				.attr("class", "context-bar")
				.attr("transform", function(d) { return "translate(" + cx(d.id) + ",0)"; })
				.attr("id", function(d){return d.id;})
				.on("mouseover",function(d) {/*d3.select(this).attr("fill-opacity",1);*/ showDetailsOnClick(d);})
				.on("mouseout", function(d) {/*d3.select(this).attr("fill-opacity",.6);*/ hideDetailsOnDemand(d);});
				
				//Rendering first layer
				contextChartEnter.append("rect")
				.attr("width", cx.rangeBand())
				.attr("y", function(d) {return cy(d.amounts[0].y1); })
				.attr("class", "rect1")
				.attr("height", function(d) { return cy(d.amounts[0].y0) - cy(d.amounts[0].y1); });
				//.style("fill", function(d) { return color(d.amounts[0].name); });
						
				//Rendering second layer													
				contextChartEnter.append("rect")
				.attr("width", cx.rangeBand())
				.attr("class", "rect2")
				.attr("y", function(d) { return cy(d.amounts[1].y1); })
				.attr("height", function(d) { return cy(d.amounts[1].y0) - cy(d.amounts[1].y1); });
				//.style("fill", function(d) { return color(d.amounts[1].name); });	
				
				//Rendering third layer													
				contextChartEnter.append("rect")
				.attr("width", cx.rangeBand())
				.attr("class", "rect3")
				.attr("y", function(d) { return cy(d.amounts[2].y1); })
				.attr("height", function(d) { return cy(d.amounts[2].y0) - cy(d.amounts[2].y1); });
				//.style("fill", function(d) { return color(d.amounts[2].name); });	
				
				context.append("g").attr("class", "y axis").call(cyAxis);
				
				//set-up brush
				context.append("g")
				.attr("class", "x brush")
				.call(brush)
				.selectAll("rect")
				.attr("y", -6)
				.attr("height", cheight + 7);
				
				
				//Filter
				//Note: Setting the length to 0 is a better way to empty as setting to [] creates a new empty array and screws the references
				filteredData.length = 0;
				filteredIDs.length = 0;
				var filtered = context.selectAll(".context-bar")
												.filter(function(d) {
													
													var df = debtFilter, cf=coaFilter, cn = controlFilter, uf = urbanFilter, st = stateFilter, sz = sizeFilter;
													var sizeValues = SIZE_CATEGORY_ARR.slice(sz[0], sz[1]+1); //+1 to include the end value too
													
													var conCondition = (cn == "All")? 1 : (d["control"] == cn);
													var urbanCondition = (uf == "All")? 1 : (d["degree_urbanization"] == uf);
													var debCondition = (df[0] <= d["debt"] && d["debt"] <= df[1]);
													var coaCondition = (cf[0] <= d["total"] && d["total"] <= cf[1]);
													var stateCondition = (st == "All")? 1 : (d["state"] == st);
													var sizeCondition = (sizeValues.indexOf(d["size_category"]) != -1);  
													if(conCondition & debCondition & coaCondition & urbanCondition & stateCondition & sizeCondition) {
														filteredData.push(d);
														filteredIDs.push(d.id);
													}
													return  conCondition & debCondition & coaCondition & urbanCondition & stateCondition & sizeCondition; 
												});
												//console.log(filteredData.length);
												context.selectAll(".rect1, .rect2, .rect3").style("fill", "#acacac");
												filtered.selectAll(".rect1, .rect2, .rect3").style("fill", "");
												
				$("#counter").html("<span style='color: #E6550D;'>"+filtered[0].length+"</span> of "+csvData.length+" cases filtered.");
				//highlightStates(fData);
				drawFocus(fData, focusMode);
				
				function brushed() {
				    var s = d3.event.target.extent();
				    if (s[1]-s[0] <= 20) {
							fx.domain(brush.empty() ? cx.domain() : cx.domain().slice(s[0], s[1]));	
							focus.select(".x.axis").call(fxAxis);
							fData =	cData.slice(s[0],s[1]);
								
							drawFocus(fData, focusMode);	
							//Highlight the states that have been brushed
							//highlightStates(fData);						
				    } else{
							//Restrict the size of brush to the width of focus area
							//d3.event.target.extent([s[0],s[0]+fwidth-1]); 
							d3.event.target.extent([s[0],s[0]+20]);
							d3.event.target(d3.select(this));
						}
				}		
				
				function showDetailsOnClick(d) {
					//Clean previously populated data
					//Do this only if you don't have persistent placeholders for data
					$(".details-on-demand").contents().remove();
					
					$.each(d, function(key, value) {
						key = (HEADER_NAME_MAP[key])? HEADER_NAME_MAP[key] : key;
						if(key != "amounts" && key != "total" && key != "id" && key != "size") {
							if(key == "name") {
								$(".details-on-demand").append("<h3>"+value+"</h3>");
							} else {
								$(".details-on-demand").append("<p>"+key+": <strong>"+value+"</strong></p>");
							}
					 }
					});
				}				
				
				function hideDetailsOnDemand(d) {
					$(".details-on-demand").contents().remove();
				}
				contextChart.exit().remove();
				contextChart.order();								
			}
	
			/*
			** Mode is used to define the comparison axis
			** "onedown" - only first variable will be plotted in negative axis
			** "twodown" - first two variables will be plotted in negative axis
			** "none" - all variables will be plotted on the positive axis
			*/
			function drawFocus(csvData, mode) {
				//Clean the leftovers
				focus.selectAll("g").remove();
				
				// var drag = d3.behavior.drag()
				// 				    .origin(Object)
				// 				    .on("drag", dragmove);
				
				var seriesY = function(seriesId) {
					switch(seriesId) {
						case 0:
						//first layer
						switch(mode){
							case ONEDOWN:
								return (function(d) { return fheight;});
							break;
							case TWODOWN:
								return (function(d) { return fheight + fy(d.amounts[1].y0) - fy(d.amounts[1].y1);});
							break;
							case ALLUP:
								return (function(d) { return fy(d.amounts[0].y1);});
							break;
						}
						
						break;
						case 1:
						//second layer
						switch(mode){
							case ONEDOWN:
								return (function(d) {return fy(d.amounts[1].y1) + fy(d.amounts[0].y0) - fy(d.amounts[0].y1);});
							break;
							case TWODOWN:
								return (function(d) { return fheight;});
							break;
							case ALLUP:
								return (function(d) {return fy(d.amounts[1].y1);});
							break;
						}
						break;
						case 2:
						//third layer
						switch(mode){
							case ONEDOWN:
								return (function(d) { return fy(d.amounts[2].y1) + fy(d.amounts[0].y0) - fy(d.amounts[0].y1);});
							break;
							case TWODOWN:
								return (function(d) { return fheight - fy(d.amounts[2].y0) + fy(d.amounts[2].y1);});
							break;
							case ALLUP:
								return (function(d) { return fy(d.amounts[2].y1);});
							break;
						}
						break;
					}
				};
				//Redraw everything
				var focusChart = focus.selectAll("g").data(csvData);
				var focusChartEnter = focusChart.enter().append("g")
				.attr("class", "focus-bar")
				.attr("transform", function(d) { return "translate(" + fx(d.id) + ",0)"; })
				.attr("fill-opacity",1)
				.attr("id", function(d){return d.id;})
				.on("mouseover",function(d) {focus.selectAll(".rect1, .rect2, .rect3").attr("fill-opacity",0.4); d3.select(this).selectAll("rect").attr("fill-opacity",1); showDetailsOnClick(d);})
				.on("mouseout", function(d) {focus.selectAll(".rect1, .rect2, .rect3").attr("fill-opacity",1); hideDetailsOnDemand(d);});
				
				//Rendering first layer
				focusChartEnter.append("rect")
				.attr("width", fx.rangeBand())
				.attr("y", seriesY(0))
				.attr("class", "rect1")
				.attr("height", function(d) { return fy(d.amounts[0].y0) - fy(d.amounts[0].y1); })
				.append("title").text(function(d) {return "Loan: $"+d.average_amount_any_loan_aid;})
				.transition();
				
						
				//Rendering second layer													
				focusChartEnter.append("rect")
				.attr("width", fx.rangeBand())
				.attr("y", seriesY(1))
				.attr("class", "rect2")
				.attr("height", function(d) { return fy(d.amounts[1].y0) - fy(d.amounts[1].y1); })
				.append("title").text(function(d) {return "Personal Contrib: $"+d.average_amount_personal_contribution;})
				.transition();	
				
				//Rendering third layer													
				focusChartEnter.append("rect")
				.attr("width", fx.rangeBand())
				.attr("y", seriesY(2))
				.attr("class", "rect3")
				.attr("height", function(d) { return fy(d.amounts[2].y0) - fy(d.amounts[2].y1); })
				.append("title").text(function(d) {return "Grant: $"+d.average_amount_any_grant_aid;})
				.transition();
				
				focus.selectAll(".rect1, .rect2, .rect3").style("fill", function(d) {return (filteredIDs.indexOf(d.id) != -1)? "":"#aaa"; });
				
				focus.append("g")
				.attr("class", "y axis")
				.call(fyAxis);
				
				//.call(drag);
				
				// function dragmove(d) {
				// 				  d3.select(this)
				// 				      .attr("transform", "translate("+this.x+","+d3.event.dy+")");
				// 				}				
							
				function showDetailsOnClick(d) {
					//Clean previously populated data
					//Do this only if you don't have persistent placeholders for data
					$(".details-on-demand").contents().remove();
					
					$.each(d, function(key, value) {
						key = (HEADER_NAME_MAP[key])? HEADER_NAME_MAP[key] : key;
						if(key != "amounts" && key != "total" && key != "id" && key != "size") {
							if(key == "name") {
								$(".details-on-demand").append("<h3>"+value+"</h3>");
							} else {
								$(".details-on-demand").append("<p>"+key+": <strong>"+value+"</strong></p>");
							}
					 }
					});
				}				
				
				function hideDetailsOnDemand(d) {
					$(".details-on-demand").contents().remove();
				}
				//focusChart.exit().remove();
				//focusChart.order();
			}


			$( "div.focus div" ).buttonset();
			$("#onedown").click(function(event){ focusMode = ONEDOWN; drawFocus(fData, focusMode);});
			$("#twodown").click(function(event){ focusMode = TWODOWN; drawFocus(fData, focusMode);});
			$("#allup").click(function(event){ focusMode = ALLUP; drawFocus(fData, focusMode);});	

			//Everytime the context is sorted the brushed region has to be resetted
			$( "div#sort-by" ).buttonset();
			$("#state-sort").click(function(event){ lastActionSort = true; sortType = STATE; drawContext(cData);});
			$("#size-sort").click(function(event){ lastActionSort = true; sortType = SIZE; drawContext(cData);});
			$("#debt-sort").click(function(event){ lastActionSort = true; sortType = DEBT; drawContext(cData);});
			$("#grant-sort").click(function(event){ lastActionSort = true; sortType = GRANT; drawContext(cData);});	
			$("#coa-sort").click(function(event){ lastActionSort = true; sortType = COA; drawContext(cData);});
			
			
			
			$("#filter-by").buttonset();
			$("#private-notprofit-filter").click(function(event){ 
				controlFilter = "Private not-for-profit";
				drawContext(cData);
			});	
			$("#private-profit-filter").click(function(event){ 
				controlFilter = "Private for-profit";
				drawContext(cData);
			});
			$("#public-filter").click(function(event){
				controlFilter = "Public";
				drawContext(cData);
			});
			
			$("#all-filter").click(function(event){
				controlFilter = "All";
				drawContext(cData);
			});
			
			$("#small-filter").click(function(event){ 
				urbanFilter = "Small";
				drawContext(cData);
			});	
			$("#midsize-filter").click(function(event){
				urbanFilter = "Midsize";
				drawContext(cData);
			});
			
			$("#large-filter").click(function(event){
				urbanFilter = "Large";
				drawContext(cData);
			});
			
			$("#all-urban-filter").click(function(event){
				urbanFilter = "All";
				drawContext(cData);
			});
			
			$(document).tooltip();
			// $(context.selectAll("g")).filter(function(index){console.log(this); return parseInt(this.id) > 40000;}).css("fill-opacity",0.1);
 			        

		}); //(document)
