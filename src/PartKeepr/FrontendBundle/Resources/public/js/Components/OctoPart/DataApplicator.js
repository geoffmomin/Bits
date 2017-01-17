Ext.define("PartKeepr.Components.OctoPart.DataApplicator", {
    extend: "Ext.Base",
    mixins: ['Ext.mixin.Observable'],

    constructor: function (config)
    {
        this.mixins.observable.constructor.call(this, config);
    },
    setPart: function (part)
    {
        this.part = part;
    },
    loadData: function (id)
    {
        Ext.Ajax.request({
            url: PartKeepr.getBasePath() + '/api/octopart/get/' + id,
            success: this.onPartLoaded,
            scope: this
        });
    },
    onPartLoaded: function (response)
    {
        var data = Ext.decode(response.responseText);

        this.data = data;

        this.applyData();
    },
    checkRequirements: function ()
    {
        var i, unit, file, image, distributor;

        var manufacturer = PartKeepr.getApplication().getManufacturerStore().findRecord("name",
            this.data.manufacturer.name);
        if (manufacturer === null) {
            this.displayWaitWindow(i18n("Creating Manufacturer…"), this.data.manufacturer.name);
            manufacturer = Ext.create("PartKeepr.ManufacturerBundle.Entity.Manufacturer");
            manufacturer.set("name", this.data.manufacturer.name);
            manufacturer.save({
                success: function ()
                {
                    PartKeepr.getApplication().getManufacturerStore().load({
                        callback: this.applyData,
                        scope: this
                    });
                },
                scope: this

            });
            return false;
        }

        for (i in this.data.specs) {
            if (this.data.specs[i].metadata.unit !== null) {
                unit = PartKeepr.getApplication().getUnitStore().findRecord("symbol",
                    this.data.specs[i].metadata.unit.symbol, 0, false, true, true);
                if (unit === null) {
                    this.displayWaitWindow(i18n("Creating Unit…"), this.data.specs[i].metadata.unit.name);
                    unit = Ext.create("PartKeepr.UnitBundle.Entity.Unit");
                    unit.set("name", this.data.specs[i].metadata.unit.name);
                    unit.set("symbol", this.data.specs[i].metadata.unit.symbol);
                    unit.save({
                        success: function ()
                        {
                            PartKeepr.getApplication().getUnitStore().load({
                                callback: this.applyData,
                                scope: this
                            });
                        },
                        scope: this

                    });
                    return false;
                }
            }
        }

        for (i in this.data.offers) {
            distributor = PartKeepr.getApplication().getDistributorStore().findRecord("name",
                this.data.offers[i].seller.name, 0, false, true, true);

            if (distributor === null) {
                this.displayWaitWindow(i18n("Creating Distributor…"), this.data.offers[i].seller.name);
                    distributor = Ext.create("PartKeepr.DistributorBundle.Entity.Distributor");
                    distributor.set("name", this.data.offers[i].seller.name);
                    distributor.set("website", this.data.offers[i].seller.homepage_url);
                    distributor.save({
                        success: function ()
                        {
                            PartKeepr.getApplication().getDistributorStore().load({
                                callback: this.applyData,
                                scope: this
                            });
                        },
                        scope: this

                    });
                    return false;
            }
        }

        if (this.data.datasheets.length > 0) {
            file = this.data.datasheets.shift();
            this.displayWaitWindow(i18n("Uploading datasheet…"), file.url);
            PartKeepr.getApplication().uploadFileFromURL(file.url, i18n("Datasheet"), this.onFileUploaded, this);
            return false;
        }

        if (this.data.cad_models.length > 0) {
            file = this.data.cad_models.shift();
            this.displayWaitWindow(i18n("Uploading CAD Model…"), file.url);
            PartKeepr.getApplication().uploadFileFromURL(file.url, i18n("CAD Model"), this.onFileUploaded, this);
            return false;
        }

        if (this.data.compliance_documents.length > 0) {
            file = this.data.compliance_documents.shift();
            this.displayWaitWindow(i18n("Uploading Compliance Document…"), file.url);
            PartKeepr.getApplication().uploadFileFromURL(file.url, i18n("Compliance Document"), this.onFileUploaded, this);
            return false;
        }

        if (this.data.reference_designs.length > 0) {
            file = this.data.reference_designs.shift();
            this.displayWaitWindow(i18n("Uploading Reference Designs…"), file.url);
            PartKeepr.getApplication().uploadFileFromURL(file.url, i18n("Reference Design"), this.onFileUploaded, this);
            return false;
        }

        if (this.data.imagesets.length > 0) {
            file = this.data.imagesets.shift();
            image = null;

            if (file.swatch_image !== null) {
                image = file.swatch_image;
            }

            if (file.small_image !== null) {
                image = file.small_image;
            }

            if (file.medium_image !== null) {
                image = file.medium_image;
            }

            if (file.large_image !== null) {
                image = file.large_image;
            }

            if (image !== null) {
                this.displayWaitWindow(i18n("Uploading Image…"), image.url);
                PartKeepr.getApplication().uploadFileFromURL(image.url, i18n("Image"), this.onFileUploaded, this);
            }

            return false;
        }


        return true;
    },
    onFileUploaded: function (options, success, response) {

        if (success) {
            var result = Ext.decode(response.responseText);

            var uploadedFile = Ext.create("PartKeepr.UploadedFileBundle.Entity.TempUploadedFile", result.response);

            this.part.attachments().add(uploadedFile);
        }

        this.applyData();
    },
    displayWaitWindow: function (text, value)
    {
        this.waitMessage = Ext.MessageBox.show({
            msg: text + "<br/>"+ value,
            progressText: value,
            width: 300,
            wait: {
                interval: 100
            },
        });
    },
    applyData: function ()
    {
        var spec, i, unit, value, siPrefix, distributor, j, partDistributor, currency;

        if (this.waitMessage instanceof Ext.window.MessageBox) {
            this.waitMessage.hide();
        }

        if (!this.checkRequirements()) {
            return;
        }

        this.part.set("name", this.data.mpn);
        this.part.set("description", this.data.short_description);

        var manufacturer = PartKeepr.getApplication().getManufacturerStore().findRecord("name",
            this.data.manufacturer.name);
        var partManufacturer;

        if (manufacturer === null) {
            // @todo put out error message
        }

        partManufacturer = Ext.create("PartKeepr.PartBundle.Entity.PartManufacturer");
        partManufacturer.setManufacturer(manufacturer);
        partManufacturer.set("partNumber", this.data.mpn);

        this.part.manufacturers().add(partManufacturer);

        for (i=0;i<this.data.offers.length;i++) {
            distributor = PartKeepr.getApplication().getDistributorStore().findRecord("name",
                this.data.offers[i].seller.name, 0, false, true, true);
            if (distributor === null) {
                // @todo put out error message
                continue;
            }

            for (currency in this.data.offers[i].prices) {
                for (j=0;j<this.data.offers[i].prices[currency].length;j++) {
                    partDistributor = Ext.create("PartKeepr.PartBundle.Entity.PartDistributor");
                    partDistributor.setDistributor(distributor);
                    partDistributor.set("sku", this.data.offers[i].sku);
                    partDistributor.set("packagingUnit", this.data.offers[i].prices[currency][j][0]);
                    partDistributor.set("currency", currency);
                    partDistributor.set("price", this.data.offers[i].prices[currency][j][1]);
                    this.part.distributors().add(partDistributor);
                }
            }
        }
        for (i in this.data.specs) {
            spec = Ext.create("PartKeepr.PartBundle.Entity.PartParameter");
            spec.set("name", this.data.specs[i].metadata.name);

            if (this.data.specs[i].metadata.unit !== null) {
                unit = PartKeepr.getApplication().getUnitStore().findRecord("symbol",
                    this.data.specs[i].metadata.unit.symbol, 0, false, true, true);

                spec.setUnit(unit);
            }

            switch (this.data.specs[i].metadata.datatype) {
                case "string":
                    spec.set("valueType", "string");
                    spec.set("stringValue", this.data.specs[i].value[0]);
                    break;
                case "decimal":
                case "integer":
                    spec.set("valueType", "numeric");

                    if (this.data.specs[i].min_value !== null) {
                        value = parseFloat(this.data.specs[i].min_value);
                        siPrefix = this.findSiPrefixForValueAndUnit(value, unit);
                        spec.set("minValue", this.applySiPrefix(value, siPrefix));
                        spec.setMinSiPrefix(siPrefix);
                    }

                    if (this.data.specs[i].max_value !== null) {
                        value = parseFloat(this.data.specs[i].max_value);
                        siPrefix = this.findSiPrefixForValueAndUnit(value, unit);
                        spec.set("maxValue", this.applySiPrefix(value, siPrefix));
                        spec.setMaxSiPrefix(siPrefix);
                    }

                    if (this.data.specs[i].value.length === 1) {
                        value = parseFloat(this.data.specs[i].value[0]);
                        siPrefix = this.findSiPrefixForValueAndUnit(value, unit);
                        spec.set("value", this.applySiPrefix(value, siPrefix));
                        spec.setSiPrefix(siPrefix);
                    }

                    break;
            }

            this.part.parameters().add(spec);

        }

        this.fireEvent("refreshData");
    },
    applySiPrefix: function (value, siPrefix) {
        return Ext.util.Format.round(value / Math.pow(siPrefix.get("base"), siPrefix.get("exponent")), 3);
    },
    findSiPrefixForValueAndUnit: function (value, unit) {
        var i = 0, prefixedValue, siPrefix;

        siPrefix = PartKeepr.getApplication().getSiPrefixStore().findRecord("exponent", 0, 0, false, false, true);

        if (!(unit instanceof PartKeepr.UnitBundle.Entity.Unit)) {
            return siPrefix;
        }

        unit.prefixes().sort("exponent", "desc");

        for (i=0;i<unit.prefixes().getCount();i++) {
            siPrefix = unit.prefixes().getAt(i);
            prefixedValue = Math.abs(this.applySiPrefix(value, siPrefix));

            if (prefixedValue < 1000 && prefixedValue > 0.9) {
                break;
            }
        }

        return siPrefix;
    }
});
