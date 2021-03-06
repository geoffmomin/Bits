Ext.define("PartKeepr.Components.OctoPart.SearchPanel", {
    extend: "Ext.panel.Panel",
    layout: 'border',
    grid: null,
    store: null,
    searchBar: null,
    xtype: 'octopartSearchPanel',

    initComponent: function ()
    {
        this.store = Ext.create("Ext.data.Store", {
            fields: [
                {name: 'title', type: 'string'},
                {name: 'url', type: 'string'},
                {name: 'mpn', type: 'string'}
            ],
            proxy: {
                type: 'ajax',
                startParam: '',
                limitParam: '',
                url: "",
                reader: {
                    type: 'json',
                    totalProperty: 'hits',
                    rootProperty: 'results'
                }
            },
            autoLoad: false
        });

        this.grid = Ext.create({
            xtype: 'grid',
            region: 'center',
            columns: [
                {
                    text: i18n("Manufacturer"),
                    dataIndex: 'manufacturer',
                    flex: 1
                },
                {
                    text: i18n("Title"),
                    dataIndex: 'title',
                    flex: 2
                }, {
                    text: i18n("MPN"),
                    dataIndex: 'mpn',
                    flex: 1
                }, {
                    text: i18n("Details…"),
                    dataIndex: 'url',
                    renderer: function (v)
                    {
                        return '<span class="web-icon fugue-icon globe-small"/></span><a href="' + v + '" target="_blank">' + i18n(
                                "Details…") + "</a>";
                    }
                }
            ],
            store: this.store
        });

        this.addButton = Ext.create("Ext.button.Button", {
            iconCls: 'fugue-icon blueprint--plus',
            text: i18n("Add Data"),
            disabled: true,
            itemId: 'add',
            handler: this.onAddClick,
            scope: this
        });

        this.grid.addDocked(Ext.create("Ext.toolbar.Paging", {
            store: this.store,
            enableOverflow: true,
            dock: 'bottom',
            displayInfo: false,
            grid: this.grid,
            items: this.addButton
        }));

        this.searchBar = Ext.create("Ext.form.field.Text", {
            region: 'north',
            height: 30,
            emptyText: i18n("Enter Search Terms"),
            listeners: {
                specialkey: function (field, e)
                {
                    if (e.getKey() == e.ENTER) {
                        this.startSearch(field.getValue());
                    }

                },
                scope: this
            }
        });

        this.items = [this.grid, this.searchBar];

        this.grid.on("itemdblclick", this.onItemDblClick, this);
        this.grid.on('selectionchange',
            this.onSelectChange,
            this);

        this.callParent(arguments);

    },
    onAddClick: function ()
    {
        var record = this.grid.getSelection()[0];
        this.applyData(record);
    },
    onSelectChange: function (selModel, selections)
    {
        this.addButton.setDisabled(selections.length === 0);
    },
    setPart: function (part)
    {
        this.part = part;
    },
    onItemDblClick: function (grid, record)
    {
        this.applyData(record);
    },
    applyData: function (record)
    {
        var j = Ext.create("PartKeepr.Components.OctoPart.DataApplicator");
        j.setPart(this.part);
        j.loadData(record.get("uid"));
        j.on("refreshData", function ()
        {
            this.fireEvent("refreshData");
        }, this);
    },
    startSearch: function (query)
    {
        this.store.getProxy().setUrl(
            PartKeepr.getBasePath() + '/api/octopart/query/?q=' + encodeURIComponent(query)
        );
        this.store.load();
        this.searchBar.setValue(query);
    }
});
