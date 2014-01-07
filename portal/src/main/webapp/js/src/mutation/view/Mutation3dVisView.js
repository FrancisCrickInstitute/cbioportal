/**
 * Actual 3D Visualizer view. This view is designed to contain the 3D
 * structure visualizer app and its control buttons.
 *
 * options: {el: [target container],
 *           parentEl: [parent container],
 *           mut3dVis: [optional] reference to the Mutation3dVis instance,
 *           pdbProxy: [optional] PDB data proxy
 *          }
 *
 * @author Selcuk Onur Sumer
 */
var Mutation3dVisView = Backbone.View.extend({
	initialize : function (options) {
		this.options = options || {};
	},
	render: function()
	{
		var self = this;

		// compile the template using underscore
		var template = _.template(
			$("#mutation_3d_vis_template").html(),
			// TODO make the image customizable?
			{loaderImage: "images/ajax-loader.gif"});

		// load the compiled HTML into the Backbone "el"
		this.$el.html(template);

		// format after rendering
		this.format();
	},
	format: function()
	{
		var self = this;
		var mut3dVis = self.options.mut3dVis;

		// initially hide the 3d visualizer container
		var container3d = self.$el;
		container3d.hide();

		// initially hide the residue warning message
		self.hideResidueWarning();

		// update the container of 3d visualizer
		if (mut3dVis != null)
		{
			mut3dVis.updateContainer(container3d);
		}

		// click listener for the close icon of the 3d vis container
		var closeHandler = function() {
			// hide the vis pane
			if (mut3dVis != null)
			{
				mut3dVis.hide();
			}

			// also hide all pdb panel views
			self.options.parentEl.find(".mutation-pdb-panel-view").slideUp();
		};

		// add listeners to panel (header) buttons

		self.$el.find(".mutation-3d-close").click(closeHandler);

		self.$el.find(".mutation-3d-minimize").click(function(){
			if (mut3dVis != null)
			{
				mut3dVis.toggleSize();
			}
		});

		// format toolbar elements

		// spin toggle
		var spinChecker = self.$el.find(".mutation-3d-spin");

		spinChecker.change(function(){
			if (mut3dVis != null)
			{
				mut3dVis.toggleSpin();
			}
		});

		// style selection menu
		var styleMenu = self.$el.find(".mutation-3d-style-select");

		// TODO chosen is sometimes problematic in Firefox when overflow is hidden...
		styleMenu.chosen({width: 120, disable_search: true});

		styleMenu.change(function(){
			var selected = $(this).val();

			if (mut3dVis != null)
			{
				mut3dVis.changeStyle(selected);
			}
		});

		// zoom buttons

		var zoomIn = self.$el.find(".mutation-3d-zoomin");
		var zoomOut = self.$el.find(".mutation-3d-zoomout");
		var zoomActual = self.$el.find(".mutation-3d-zoomactual");

		var zoomButtonSet = self.$el.find(".mutation-3d-button");
		zoomButtonSet.tipTip();

		// TODO add also tips
		zoomIn.click(function() {
			if (mut3dVis != null)
			{
				mut3dVis.zoomIn();
			}
		});

		zoomOut.click(function() {
			if (mut3dVis != null)
			{
				mut3dVis.zoomOut();
			}
		});

		zoomActual.click(function() {
			if (mut3dVis != null)
			{
				mut3dVis.zoomActual();
			}
		});


		// TODO this is an access to a global div out of this view's template...
		$("#tabs").bind("tabsactivate", function(event, ui){
			closeHandler();
		});
	},
	/**
	 * Updates the 3D visualizer content for the given gene,
	 * pdb id, and chain.
	 *
	 * @param geneSymbol    hugo gene symbol
	 * @param pdbId         pdb id
	 * @param chain         PdbChainModel instance
	 * @param callback      function to be called after update
	 */
	updateView: function(geneSymbol, pdbId, chain, callback)
	{
		var self = this;
		var mut3dVis = self.options.mut3dVis;
		var pdbProxy = self.options.pdbProxy;

		var mapCallback = function(positionMap) {
			// update position map of the chain
			chain.positionMap = positionMap;

			// reload the selected pdb and chain data
			mut3dVis.show();
			self.refreshView(pdbId, chain, callback);

			// store pdb id and chain for future reference
			self.pdbId = pdbId;
			self.chain = chain;
		};

		var infoCallback = function(pdbInfo) {
			var model = {pdbId: pdbId,
				chainId: chain.chainId,
				pdbInfo: ""};

			if (pdbInfo)
			{
				model.pdbInfo = pdbInfo;
			}

			// init info view
			var infoView = new Mutation3dVisInfoView(
				{el: self.$el.find(".mutation-3d-info"), model: model});
			infoView.render();

			// update positionMap for the chain
			// (retrieve data only once)
			pdbProxy.getPositionMap(geneSymbol, chain, mapCallback);
		};

		pdbProxy.getPdbInfo(pdbId, infoCallback);
	},
	/**
	 * Refreshes (reloads) the 3D visualizer for the given
	 * pdb id and chain.
	 *
	 * If no pdb id and chain provided, then reloads with
	 * the last known pdb id and chain.
	 *
	 * @param pdbId     pdb id
	 * @param chain     PdbChainModel instance
	 * @param callback  function to be called after refresh
	 */
	refreshView: function(pdbId, chain, callback)
	{
		var self = this;
		var mut3dVis = self.options.mut3dVis;

		// check if pdb id and chain is provided
		if (!pdbId && !chain)
		{
			// just reload with the last known pdb id and chain
			pdbId = self.pdbId;
			chain = self.chain;
		}

		// hide residue warning
		self.hideResidueWarning();

		// show loader image
		self.showLoader();

		// set a short delay to allow loader image to appear
		setTimeout(function() {
			// reload the visualizer
			mut3dVis.reload(pdbId, chain, function() {
				// hide the loader image after reload complete
				self.hideLoader();
				// call the provided custom callback function, too
				if (_.isFunction(callback))
				{
					callback();
				}
			});
		}, 50);
	},
	/**
	 * Minimizes the 3D visualizer panel.
	 */
	minimizeView: function()
	{
		var self = this;
		var mut3dVis = self.options.mut3dVis;

		mut3dVis.minimize();
	},
	/**
	 * Restores the 3D visualizer panel to its full size.
	 */
	maximizeView: function()
	{
		var self = this;
		var mut3dVis = self.options.mut3dVis;

		mut3dVis.maximize();
	},
	isVisible: function()
	{
		var self = this;
		var mut3dVis = self.options.mut3dVis;

		return mut3dVis.isVisible();
	},
	/**
	 * Focuses the 3D visualizer on the residue
	 * corresponding to the given pileup of mutations.
	 *
	 * If this function is invoked without a parameter,
	 * then resets the focus to the default state.
	 *
	 * @param pileup    Pileup instance
	 * @return {boolean} true if focus successful, false otherwise
	 */
	focusView: function(pileup)
	{
		var self = this;
		var mut3dVis = self.options.mut3dVis;

		if (pileup)
		{
			return mut3dVis.focusOn(pileup);
		}
		else
		{
			mut3dVis.resetFocus();
			return true;
		}
	},
	/**
	 * Shows the loader image for the 3D vis container.
	 */
	showLoader: function()
	{
		var self = this;
		var loaderImage = self.$el.find(".mutation-3d-vis-loader");
		var container = self.$el.find(".mutation-3d-vis-container");

		// hide actual vis container
		// (jQuery.hide function is problematic with 3D visualizer,
		// instead we are changing height)
		self._actualHeight =  container.css("height");
		container.css("height", 0);

		// show image
		loaderImage.show();
	},
	/**
	 * Hides the loader image and shows the actual 3D visualizer content.
	 */
	hideLoader: function()
	{
		var self = this;
		var loaderImage = self.$el.find(".mutation-3d-vis-loader");
		var container = self.$el.find(".mutation-3d-vis-container");

		// hide image
		loaderImage.hide();

		// show actual vis container
		container.css("height", self._actualHeight);
	},
	/**
	 * Shows a warning message for unmapped residues.
	 */
	showResidueWarning: function()
	{
		var self = this;
		var residueWarning = self.$el.find(".mutation-3d-residue-warning");

		residueWarning.show();
	},
	/**
	 * Hides the residue warning message.
	 */
	hideResidueWarning: function()
	{
		var self = this;
		var residueWarning = self.$el.find(".mutation-3d-residue-warning");

		residueWarning.hide();
	}
});