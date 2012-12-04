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
	* in case of twodown and heighest data values, bottom bars get cut
	* on refreshing the page the map resets only half the time
	* on sorting the filter becomes ineffective but the selection of filter remains intact
	* when filters move the data appears to change. Weird!!
	* on filtering the brush shouldn't change
	* Puerto Rico is missing from the map but there are cases for that.
	
*/
	
		$(document).ready(function() {
			var cmargin = {top: 20, right: 10, bottom: 20, left: 40},
			fmargin = {top: 20, right: 10, bottom: 230, left: 40},
			cwidth = 1060 - cmargin.left - cmargin.right, //width=# of rows in csv
			fwidth = 343 - fmargin.left - fmargin.right,
			cheight = 200 - cmargin.top - cmargin.bottom,
			fheight = 500 - fmargin.top - fmargin.bottom;
	
			var cx = d3.scale.ordinal().rangeRoundBands([0, cwidth], .1),
			fx = d3.scale.ordinal().rangeRoundBands([0, fwidth], .1),
			cy = d3.scale.linear().range([cheight, 0]),
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
			.tickFormat(function(d) { return Math.round(d / 1e3) + "K"; });
									
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
			var sizeFilter = "";
			var stateFilter = "";
			var debtFilter = [];
			var coaFilter = [];
			
			
			//Focus modes
			var ALLUP = 0;
			var ONEDOWN = 1;
			var TWODOWN = 2;
			
			//Sort types
			var STATE = 0;
			var DEBT = 1;
			var GRANT = 2;
			var COA = 3;
			
			var HEADER_NAME_MAP = {"average_amount_any_loan_aid":"Avg. Loan", 
														"average_amount_personal_contribution":"Avg. Personal Contribution", 
														"average_amount_any_grant_aid": "Avg. Grant",
														"average_coa": "Avg. COA",
														"control": "Control Type",
														"degree_urbanization": "Degree Urbanization",
														"size_category": "Size",
														"debt" : "Avg. Debt",
														"state" : "State"
													};
			
			var focusMode = TWODOWN;
			var sortType = COA;
			
			var cData = [], fData = [], filteredData = [];
			
			var width = 700,
			    height = 500;
			
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
						.on("mouseover",function(d) {d3.select(this).style("stroke","red"); highlightCasesOnStateHover(d);})
						.on("mouseout", function(d) {d3.select(this).style("stroke","white"); stateFilter = "All"; drawContext(cData);})
						/*.on("click", click)*/;
			});
			
			function click(d) {
				d3.select(this).style("fill", "red");
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
			
			d3.csv("data/merged_files_less_schools.csv", function(error,csvData) {
				color.domain(["average_amount_any_loan_aid", "average_amount_personal_contribution", "average_amount_any_grant_aid"]);
				
				// Convert strings to numbers.
				csvData.forEach(function(d, i) {
					if(d.average_amount_any_loan_aid == "") {
						d.average_amount_any_loan_aid = +0;
					}
					d.average_amount_any_loan_aid = +d.average_amount_any_loan_aid;
					if(d.average_amount_any_grant_aid == "") {
						d.average_amount_any_grant_aid = +0;
					}
					d.average_amount_any_grant_aid = +d.average_amount_any_grant_aid;
					if(d.average_amount_personal_contribution == "") {
						d.average_amount_personal_contribution = +0;
					}
					d.average_amount_personal_contribution = +d.average_amount_personal_contribution;
					
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
				sizeFilter = "All";
				stateFilter = "All";
				debtFilter = debtRange;
				coaFilter = coaRange;
				
				//This piece of code to setup sliders occurs here in order force it to use values of debtRange
				//and coaRange
				$( "#debt-slider-range" ).slider({
				            range: true,
				            min: debtRange[0],
				            max: debtRange[1],
				            values: debtRange,
				            slide: function( event, ui ) {
				                $( "#debt-range" ).text( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
												// var filtered = context.selectAll(".context-bar").filter(function(d, i) {
												// 	return (d["debt"] > ui.values[ 0 ] && d["debt"] < ui.values[ 1 ]); });

													debtFilter[0] = ui.values[ 0 ];
													debtFilter[1] = ui.values[ 1 ]
													drawContext(cData);
				            }
				        });
				        $( "#debt-range" ).text( "$" + $( "#debt-slider-range" ).slider( "values", 0 ) +
				            " - $" + $( "#debt-slider-range" ).slider( "values", 1 ) );
				
				
				$( "#coa-slider-range" ).slider({
				            range: true,
				            min: coaRange[0],
				            max: coaRange[1],
				            values: coaRange,
				            slide: function( event, ui ) {
				                $( "#coa-range" ).text( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
												// var filtered = context.selectAll(".context-bar").filter(function(d, i) {
												// 													return (d["total"] > ui.values[ 0 ] && d["total"] < ui.values[ 1 ]); });
													
													coaFilter[0] = ui.values[ 0 ];
													coaFilter[1] = ui.values[ 1 ]
													
													drawContext(cData);
				            }
				        });
				        $( "#coa-range" ).text( "$" + $( "#coa-slider-range" ).slider( "values", 0 ) +
				            " - $" + $( "#coa-slider-range" ).slider( "values", 1 ) );
										
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

				//csvData = sortData(csvData, sortType);
				
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
				csvData = sortData(csvData, sortType);
				
				
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
				.on("mouseover",function(d) {d3.select(this).attr("fill-opacity",1); showDetailsOnClick(d);})
				.on("mouseout", function(d) {d3.select(this).attr("fill-opacity",.6); hideDetailsOnDemand(d);});
				
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
				
				
				
				//set-up brush
				context.append("g")
				.attr("class", "x brush")
				.call(brush)
				.selectAll("rect")
				.attr("y", -6)
				.attr("height", cheight + 7);
				
				
				var i = 0;
				//Filter
				filteredData = [];
				var filtered = context.selectAll(".context-bar")
												.filter(function(d, i) {
													
													var df = debtFilter, cf = coaFilter, cn = controlFilter, sf = sizeFilter, st = stateFilter;
													
													var conCondition = (cn == "All")? 1 : (d["control"] == cn || cn == d["control"].slice(0,7));
													var sizeCondition = (sf == "All")? 1 : (d["degree_urbanization"] == sf);
													var debCondition = (df[0] <= d["debt"] && d["debt"] <= df[1]);
													var coaCondition = (cf[0] <= d["total"] && d["total"] <= cf[1]);
													var stateCondition = (st == "All")? 1 : (d["state"] == st);
													if(conCondition & debCondition & coaCondition & sizeCondition & stateCondition) filteredData[i++] = d;
													return  conCondition & debCondition & coaCondition & sizeCondition & stateCondition; 
												});
												//console.log(filteredData.length);
												context.selectAll(".rect1, .rect2, .rect3").style("fill", "#acacac");
												filtered.selectAll(".rect1, .rect2, .rect3").style("fill", "");
												
				$("#counter").html("<span style='color: red;'>"+filtered[0].length+"</span> of "+csvData.length+" cases filtered.");
				highlightStates(fData);
				drawFocus(fData, focusMode);
				
				function brushed() {
				    var s = d3.event.target.extent();
				    if (s[1]-s[0] <= 20) {
							fx.domain(brush.empty() ? cx.domain() : cx.domain().slice(s[0], s[1]));	
							focus.select(".x.axis").call(fxAxis);
							fData =	cData.slice(s[0],s[1]);
								
							drawFocus(fData, focusMode);	
							//Highlight the states that have been brushed
							highlightStates(fData);						
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
						if(key != "amounts" && key != "total" && key != "id") {
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
				
				var drag = d3.behavior.drag()
				    .origin(Object)
				    .on("drag", dragmove);
				
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
				.attr("fill-opacity",.6)
				.attr("id", function(d){return d.id;})
				.on("mouseover",function(d) {d3.select(this).attr("fill-opacity",1); showDetailsOnClick(d);})
				.on("mouseout", function(d) {d3.select(this).attr("fill-opacity",.6); hideDetailsOnDemand(d);});
				
				//Rendering first layer
				focusChartEnter.append("rect")
				.attr("width", fx.rangeBand())
				.attr("y", seriesY(0))
				.attr("height", function(d) { return fy(d.amounts[0].y0) - fy(d.amounts[0].y1); })
				.transition()
				.style("fill", function(d) { return color(d.amounts[0].name); });
						
				//Rendering second layer													
				focusChartEnter.append("rect")
				.attr("width", fx.rangeBand())
				.attr("y", seriesY(1))
				.attr("height", function(d) { return fy(d.amounts[1].y0) - fy(d.amounts[1].y1); })
				.transition()
				.style("fill", function(d) { return color(d.amounts[1].name); });	
				
				//Rendering third layer													
				focusChartEnter.append("rect")
				.attr("width", fx.rangeBand())
				.attr("y", seriesY(2))
				.attr("height", function(d) { return fy(d.amounts[2].y0) - fy(d.amounts[2].y1); })
				.transition()
				.style("fill", function(d) { return color(d.amounts[2].name); });
				//.call(drag);
				
				function dragmove(d) {
				  d3.select(this)
				      .attr("transform", "translate("+this.x+","+d3.event.dy+")");
				}				
							
				function showDetailsOnClick(d) {
					//Clean previously populated data
					//Do this only if you don't have persistent placeholders for data
					$(".details-on-demand").contents().remove();
					
					$.each(d, function(key, value) {
						key = (HEADER_NAME_MAP[key])? HEADER_NAME_MAP[key] : key;
						if(key != "amounts" && key != "total" && key != "id") {
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
			$("#state-sort").click(function(event){ sortType = STATE; drawContext(cData);});
			$("#debt-sort").click(function(event){ sortType = DEBT; drawContext(cData);});
			$("#grant-sort").click(function(event){ sortType = GRANT; drawContext(cData);});	
			$("#coa-sort").click(function(event){ sortType = COA; drawContext(cData);});
			
			
			
			$("#filter-by").buttonset();
			$("#private-filter").click(function(event){ 
				controlFilter = "Private";
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
				sizeFilter = "Small";
				drawContext(cData);
			});	
			$("#midsize-filter").click(function(event){
				sizeFilter = "Midsize";
				drawContext(cData);
			});
			
			$("#large-filter").click(function(event){
				sizeFilter = "Large";
				drawContext(cData);
			});
			
			$("#all-size-filter").click(function(event){
				sizeFilter = "All";
				drawContext(cData);
			});
			
			// $(context.selectAll("g")).filter(function(index){console.log(this); return parseInt(this.id) > 40000;}).css("fill-opacity",0.1);
 
			        

		}); //(document)