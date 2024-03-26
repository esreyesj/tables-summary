// ==UserScript==
// @name         Change Background Color
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Change background color to red
// @author       Your name
// @match        https://example.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    function clearElement(element){
        element.innerHTML = '';
    }
    class AmazonAssociate {
        constructor(type, id, name, manager, hours, rate, path,href) {
            this.type = type;
            this.id = id;
            this.name = name;
            this.manager = manager;
            this.path = path;
            this.hours = new Map() 
            this.hours.set(path,{'hours':parseFloat(hours)});
            this.rate = Array.from(rate);
            this.jobs = new Map();
            this.href = href;
        }

        getTotalUnits() {
            // Method implementation
            let total = 0;
            let entries = this.jobs.entries();
            for (let [key,value] of entries) {
                for (let [action,unit] of value.entries()) {
                    unit.units === '' ? total += 0 :
                    total += parseInt(unit.units);
                }
            }
            return total;
        }
        getUnitsByJob(job) {
            // Method implementation
            let total = 0;
            if(!this.jobs.get(job))return 0;
            let entries = this.jobs.get(job).entries();
            for (let [key,value] of entries) {
                value.units === '' ? total += 0 :
                total += parseInt(value.units);
            }
            return total;
        }

        getUnitsBySingleJob(job,path) { 
            // Method implementation
            let total = 0;
            if(path === 'Total') return  this.getUnitsByJob(job)
            if(!this.jobs.get(job))return 0;
            let entries = this.jobs.get(job).get(path).units;
            entries === '' ? total += 0 :total += parseInt(entries);
            return total;
        }
        getHourByJob(job) {
            // Method implementation
            if (!this.hours.get(job)) return 0;
            return this.hours.get(job).hours;
        }

        getTotalUPH() {
            // Method implementation
            if(!this.getTotalHours())return 0;
            return (this.getTotalUnits()/this.getTotalHours()).toFixed(2);
        }
        getTotalHours(){
            let total = 0;
            if(!this.hours)return 0;
            let entries = this.hours.entries();
            for (let [key,value] of entries) {
                if(isNaN(value.hours)) total += 0;
                total += value.hours;
            }
            return total.toFixed(2);
        }
        createMap(caption,actionJobs){
            let root = caption.childNodes[0].textContent.replace(/\n/g, '')
            this.jobs.set(root,new Map());
            actionJobs.forEach((job)=>{
                let units = this.rate.shift().outerText;
                let UPH = this.rate.shift().outerText;
                this.jobs.get(root).set(job,
                        {units:units,UPH:UPH});
            })

        }

    }
    class AmazonAssociateTable {
        constructor(tableID) {
            this.tableID = tableID;
            this.tableRender= null;
            this.table = document.querySelector(`#${tableID}`);
            this.caption = this.table.querySelector('caption');
            this.header = this.table.querySelector('thead');
            this.body = this.table.querySelector('tbody');
            this.rawData = this.body.querySelectorAll('tr');
            this.actionJobs = [];
            const jobValue = {name:this.caption.childNodes[0].textContent.replace(/\n/g, ''),jobs:[]};
            this.header.querySelectorAll('.job-action').forEach((el) => {
                jobValue.jobs.push(el.textContent);
            });
            this.actionJobs.push(jobValue);
            this.associates = [];
            this.curhours = 1;
            this.fillAssociates();

        }

        fillAssociates() {
            this.rawData.forEach((emp) => {
                let empDetails = emp.querySelectorAll('td:not([class])');
                if(emp.childNodes[17].innerText){          
                    const AAinstance = new AmazonAssociate(
                                empDetails[0].outerText,
                                empDetails[1].outerText,
                                empDetails[2].outerText,
                                empDetails[3].outerText,
                                emp.childNodes[17].innerText,
                                emp.querySelectorAll('td[class="numeric"]'),
                                this.caption.childNodes[0].textContent.replace(/\n/g, ''),
                                empDetails[1].childNodes[1].href
                                );
                            this.associates.push(AAinstance);
                            AAinstance.createMap(this.caption,this.actionJobs[this.actionJobs.length-1].jobs);    
                }
            });
        }

        mergeTables(AAtable){
            AAtable.associates.forEach((emp)=>{
                let exist = this.associates.some(obj => obj.id === emp.id);
                if(exist){
                    let associate = this.associates.find(obj => obj.id === emp.id);
                    associate.hours.set(emp.path,{'hours':emp.hours.get(emp.path).hours});
                    associate.jobs.set(emp.path,emp.jobs.get(emp.path));
                }else{
                    this.associates.push(emp);
                    
                }
            })
            this.actionJobs.push({name:AAtable.caption.childNodes[0].textContent.replace(/\n/g, ''),jobs:AAtable.actionJobs[0].jobs});
        }

        createHeaderTable(name){
            this.tableRender.setAttribute('class', 'sortable result-table align-left tablesorter tablesorter-default tablesorter2ef6169fcbdc2');
            this.tableRender.setAttribute('id', 'mergedTable');
            //element caption
            let caption = document.createElement('caption');
            caption.textContent = `${name} Summary`;
            //element span for filter
            let span = document.createElement('span');
            span.setAttribute('class', 'filter highlightfilter singlefilter togglefilter');
            //add filters below
            caption.appendChild(span);
            this.tableRender.appendChild(caption);
            //element thead
            let theadInfoAA = document.createElement('thead');
            //element tr
            let basicInfo = document.createElement('tr');
            basicInfo.setAttribute('class', 'tablesorter-headerRow');
            //element th
            const info = ['Type','ID','Name','Manager'];
            info.forEach((el,index)=>{
                let type = document.createElement('th');
                let auxDiv = document.createElement('div');
                auxDiv.setAttribute('class', 'tablesorter-header-inner');
                auxDiv.textContent = el;
                type.appendChild(auxDiv);
                type.setAttribute('rowspan', '3');
                type.setAttribute('data-column', index);
                type.setAttribute('tabindex', '0');
                type.setAttribute('scope', 'col');
                type.setAttribute('role', 'columnheader');
                type.setAttribute('aria-disabled', 'false');
                basicInfo.appendChild(type);
            });
            theadInfoAA.appendChild(basicInfo);
            //element tr tables
            let tablesInfo = this.actionJobs.entries();
            let sumaryElement = document.createElement('th');
            sumaryElement.textContent = 'Summary';
            sumaryElement.setAttribute('class', 'job-action');
            sumaryElement.setAttribute('colspan', 3);
            sumaryElement.setAttribute('rowspan', 2);
            sumaryElement.setAttribute('data-column', 4);
            basicInfo.appendChild(sumaryElement);
            for (let [key,value] of tablesInfo) {
                let dataColumn = 4;
                let tableJobsLength = value.jobs.length;
                let tableName = document.createElement('th');
                tableName.textContent = value.name;
                tableName.setAttribute('class', 'job-action');
                tableName.setAttribute('colspan', (tableJobsLength*2)+3);
                tableName.setAttribute('data-column', dataColumn );
                dataColumn += tableJobsLength+2;
                basicInfo.appendChild(tableName);
            }
            theadInfoAA.appendChild(basicInfo);
            //thead jobs
            let jobs = this.actionJobs.entries();
            let dataColumn = 4;
            let jobsRow = document.createElement('tr');

            let unitsUPH = document.createElement('tr');
            for (let [key,value] of jobs) {
                let hours = document.createElement('th');
                hours.textContent = 'Paid Hours';
                hours.setAttribute('class', 'job-action');
                hours.setAttribute('data-column', dataColumn);
                dataColumn += 1;
                unitsUPH.appendChild(hours);
                let units = document.createElement('th');
                units.textContent = 'Units';
                units.setAttribute('class', 'job-action');
                units.setAttribute('data-column', dataColumn);
                let UPH = document.createElement('th');
                UPH.textContent = 'UPH';
                UPH.setAttribute('class', 'job-action');
                UPH.setAttribute('data-column', dataColumn+1);
                dataColumn += 2;
                unitsUPH.appendChild(units);
                unitsUPH.appendChild(UPH);
                value.jobs.forEach((job)=>{
                    let jobName = document.createElement('th');
                    jobName.textContent = job;
                    jobName.setAttribute('class', 'job-action');
                    jobName.setAttribute('data-column', dataColumn);
                    jobName.setAttribute('colspan', 2);
                    jobsRow.appendChild(jobName);
                    let units = document.createElement('th');
                    units.textContent = 'Units';
                    units.setAttribute('class', 'job-action');
                    units.setAttribute('data-column', dataColumn);
                    let UPH = document.createElement('th');
                    UPH.textContent = 'UPH';
                    UPH.setAttribute('class', 'job-action');
                    UPH.setAttribute('data-column', dataColumn+1);
                    dataColumn += 2;
                    unitsUPH.appendChild(units);
                    unitsUPH.appendChild(UPH);
                });
            }
            theadInfoAA.appendChild(jobsRow);
            theadInfoAA.appendChild(unitsUPH );
            this.tableRender.appendChild(theadInfoAA);
            
        }
        createBodyTable(){
        let tbody = document.createElement('tbody');
        this.associates.forEach((aa)=>{
            if(aa.getTotalHours() <= 1 || isNaN(aa.getTotalHours())) return;
            let trAA = document.createElement('tr');
            let tdType = document.createElement('td');
            tdType.textContent = aa.type;
            let tdId = document.createElement('td');
            let aid = document.createElement('a');
            aid.setAttribute('href', aa.href);
            aid.textContent = aa.id;
            tdId.appendChild(aid);
            let tdName = document.createElement('td');
            let aName = document.createElement('a');
            aName.setAttribute('href', aa.href);
            aName.textContent = aa.name;
            tdName.appendChild(aName);
            let tdManager = document.createElement('td');
            tdManager.textContent = aa.manager;
            trAA.appendChild(tdType);
            trAA.appendChild(tdId);
            trAA.appendChild(tdName);
            trAA.appendChild(tdManager);
            let hours = document.createElement('td');
            hours.textContent = aa.getTotalHours() ;
            trAA.appendChild(hours);
            let totalUnits = document.createElement('td');
            totalUnits.textContent = aa.getTotalUnits();
            let totalUPH = document.createElement('td');
            totalUPH.textContent = (aa.getTotalUnits()/aa.getTotalHours()).toFixed(2);
            trAA.appendChild(totalUnits);
            trAA.appendChild(totalUPH);
            tbody.appendChild(trAA);
            this.tableRender.appendChild(tbody);
            let pathEntries = aa.jobs.entries();
            for (let [key,value] of pathEntries) {
                totalUPH.textContent = (aa.getUnitsByJob(key)/aa.getHourByJob(key)).toFixed(2);
                trAA.appendChild(totalUnits);
                trAA.appendChild(totalUPH);
                let jobActions = value.entries();
                for (let [job,unit] of jobActions) {
                    let units = document.createElement('td');
                    units.textContent = unit.units;
                    let UPH = document.createElement('td');
                    UPH.textContent = unit.UPH;
                    trAA.appendChild(units);
                    trAA.appendChild(UPH);
                }
            }
        });
        }
        footerTable(){
            let tfoot = document.createElement('tfoot');
            let trFoot = document.createElement('tr');
            trFoot.setAttribute('class', 'total empl-all');
            let thFoot = document.createElement('th');
            thFoot.textContent = 'Total';
            thFoot.setAttribute('colspan', '4');
            thFoot.setAttribute('data-column', '0');
            // total elements   
            let totalHours = document.createElement('td');
            totalHours.setAttribute('data-column', '4');
            totalHours.textContent = this.associates.reduce((acc, cur) => {
                // Ensure that you return the accumulator after each iteration
                return isNaN(cur.getTotalHours()) ? acc + 0 : acc + parseFloat(cur.getTotalHours());
            }, 0).toFixed(2);
            let totalUnits = document.createElement('td');
            totalUnits.setAttribute('data-column', '5');
            totalUnits.textContent = this.associates.reduce((acc,cur)=>acc+parseFloat(cur.getTotalUnits()),0);
            let totalUPH = document.createElement('td');
            totalUPH.setAttribute('data-column', '6');
            totalUPH.textContent = (totalUnits.textContent/totalHours.textContent).toFixed(2) ;
            trFoot.appendChild(thFoot);
            trFoot.appendChild(totalHours);
            trFoot.appendChild(totalUnits);
            trFoot.appendChild(totalUPH);
            let jobsT = this.actionJobs.entries();
            let dataColumnT = 7;

            for (let [key,value] of jobsT) {
                let hours = document.createElement('td');
                hours.setAttribute('data-column', dataColumnT);
                hours.textContent = this.associates.reduce((acc,cur)=>{
                return isNaN(cur.getHourByJob(value.name)) ? acc+0 : acc+parseFloat(cur.getHourByJob(value.name));
                },0).toFixed(2);
                value.jobs.forEach((job)=>{
                    let totalUnits = document.createElement('td');
                    totalUnits.setAttribute('data-column', dataColumnT+1);
                    totalUnits.textContent = this.associates.reduce((acc,cur)=>{
                        return isNaN(cur.getUnitsBySingleJob(value.name,job))?acc+=0:acc+cur.getUnitsBySingleJob(value.name,job);
                    },0);
                    let totalUPH = document.createElement('td');
                    totalUPH.setAttribute('data-column', dataColumnT+2);
                    totalUPH.textContent = (totalUnits.textContent/hours.textContent).toFixed(2);
                    trFoot.appendChild(totalUnits);
                    trFoot.appendChild(totalUPH);
                    dataColumnT += 2;
                });
            }
            

            tfoot.appendChild(trFoot);
            this.tableRender.appendChild(tfoot);

        }
        renderSingleTable(){
            const parent = document.querySelector('.main-panel') ;
            this.tableRender = document.createElement('table');
            this.createHeaderTable(this.associates[0].path);
            this.createBodyTable();
            this.footerTable();
            parent.insertBefore(this.tableRender,parent.childNodes[40]) 
        
        }
        orderByUPH(){
            this.associates.sort((a, b) => (parseFloat(a.getTotalUPH()) < parseFloat(b.getTotalUPH())) ? 1 : -1);
            clearElement(this.tableRender);
            this.renderSingleTable();
        }

        orderByManager(){
            this.associates.sort((a, b) => (a.manager > b.manager) ? 1 : -1);
            clearElement(this.tableRender);
            this.renderSingleTable();
        }
        orderByTotalUnits(){
            this.associates.sort((a, b) => (a.getTotalUnits() < b.getTotalUnits()) ? 1 : -1);
            clearElement(this.tableRender);
            this.renderSingleTable();
        }
        orderByTotalHours(){
            this.associates.sort((a, b) => (a.getTotalHours() > b.getTotalHours()) ? 1 : -1);
            clearElement(this.tableRender);
            this.renderSingleTable();
        }

    }
    const cRetPSTable = new AmazonAssociateTable('function-4300006654');
 //   const addinsPS = new AmazonAssociateTable('function-1599235212848');
 //   cRetPSTable.mergeTables(addinsPS);
    cRetPSTable.renderSingleTable();
    cRetPSTable.orderByManager();

    const parent = document.querySelector('.main-panel') ;
    const table = document.createElement('table');

    function headerTable(){
            table.setAttribute('class', 'sortable result-table align-left tablesorter tablesorter-default tablesorter2ef6169fcbdc2');
            table.setAttribute('id', 'mergedTable');
            //element caption
            let caption = document.createElement('caption');
            caption.textContent = 'C-Ret PS & Add-ins ';
            //element span for filter
            let span = document.createElement('span');
            span.setAttribute('class', 'filter highlightfilter singlefilter togglefilter');
            //add filters below
            caption.appendChild(span);
            table.appendChild(caption);
            //element thead
            let theadInfoAA = document.createElement('thead');
            //element tr
            let basicInfo = document.createElement('tr');
            basicInfo.setAttribute('class', 'tablesorter-headerRow');
            //element th
            const info = ['Type','ID','Name','Manager'];
            info.forEach((el,index)=>{
                let type = document.createElement('th');
                type.textContent = el;
                type.setAttribute('class', 'tablesorter-sortableHeader tablesorter-header tablesorter-headerUnSorted');
                type.setAttribute('rowspan', '3');
                type.setAttribute('data-column', index);
                type.setAttribute('tabindex', '0');
                type.setAttribute('scope', 'col');
                type.setAttribute('role', 'columnheader');
                type.setAttribute('aria-disabled', 'false');
                basicInfo.appendChild(type);
            });
            theadInfoAA.appendChild(basicInfo);
            //element tr tables
            let tablesInfo = cRetPSTable.actionJobs.entries();
            let sumaryElement = document.createElement('th');
            sumaryElement.textContent = 'Summary';
            sumaryElement.setAttribute('class', 'job-action');
            sumaryElement.setAttribute('colspan', 3);
            sumaryElement.setAttribute('rowspan', 2);
            sumaryElement.setAttribute('data-column', 4);
            basicInfo.appendChild(sumaryElement);
            for (let [key,value] of tablesInfo) {
                let dataColumn = 4;
                let tableJobsLength = value.jobs.length;
                let tableName = document.createElement('th');
                tableName.textContent = value.name;
                tableName.setAttribute('class', 'job-action');
                tableName.setAttribute('colspan', (tableJobsLength*2)+3);
                tableName.setAttribute('data-column', dataColumn );
                dataColumn += tableJobsLength+2;
                basicInfo.appendChild(tableName);
            }
            theadInfoAA.appendChild(basicInfo);
            //thead jobs
            let jobs = cRetPSTable.actionJobs.entries();
            let dataColumn = 7;
            let jobsRow = document.createElement('tr');
            let sumaryHours = document.createElement('th');
            sumaryHours.textContent = 'Hours';
            sumaryHours.setAttribute('class', 'job-action');
            sumaryHours.setAttribute('data-column', 4);
            jobsRow.appendChild(sumaryHours);
            let sumaryUnits = document.createElement('th');
            sumaryUnits.textContent = 'Units';
            sumaryUnits.setAttribute('class', 'job-action');
            sumaryUnits.setAttribute('data-column', 5);
            jobsRow.appendChild(sumaryUnits);
            let sumaryUPH = document.createElement('th');
            sumaryUPH.textContent = 'UPH';
            sumaryUPH.setAttribute('class', 'job-action');
            sumaryUPH.setAttribute('data-column', 6);
            jobsRow.appendChild(sumaryUPH);
            let unitsUPH = document.createElement('tr');
            for (let [key,value] of jobs) {
                let hours = document.createElement('th');
                hours.textContent = 'Paid Hours';
                hours.setAttribute('class', 'job-action');
                hours.setAttribute('data-column', dataColumn);
                dataColumn += 1;
                jobsRow.appendChild(hours);
                let totalHours = document.createElement('th');
                totalHours.textContent = 'Total';
                totalHours.setAttribute('class', 'job-action');
                totalHours.setAttribute('data-column', dataColumn-1);
                unitsUPH.appendChild(totalHours);
                value.jobs.unshift('Total');
                value.jobs.forEach((job)=>{
                    let jobName = document.createElement('th');
                    jobName.textContent = job;
                    jobName.setAttribute('class', 'job-action');
                    jobName.setAttribute('data-column', dataColumn);
                    jobName.setAttribute('colspan', 2);
                    jobsRow.appendChild(jobName);
                    let units = document.createElement('th');
                    units.textContent = 'Units';
                    units.setAttribute('class', 'job-action');
                    units.setAttribute('data-column', dataColumn);
                    let UPH = document.createElement('th');
                    UPH.textContent = 'UPH';
                    UPH.setAttribute('class', 'job-action');
                    UPH.setAttribute('data-column', dataColumn+1);
                    dataColumn += 2;
                    unitsUPH.appendChild(units);
                    unitsUPH.appendChild(UPH);
                });
            }
            theadInfoAA.appendChild(jobsRow);
            theadInfoAA.appendChild(unitsUPH );
            table.appendChild(theadInfoAA);
    
    }
    function bodyTable(){
        let blankspaces = 0;
        let tbody = document.createElement('tbody');
        cRetPSTable.associates.forEach((aa)=>{
            let addfinal = false;
            let addbegining = false;
            if(aa.jobs.size === 1 && aa.path === cRetPSTable.actionJobs[0].name){
                blankspaces = cRetPSTable.actionJobs[1].jobs.length*2+1;
                addfinal = true
            }else if(aa.jobs.size === 1 && aa.path === cRetPSTable.actionJobs[1].name){
                blankspaces = cRetPSTable.actionJobs[0].jobs.length*2+1;
                addbegining = true;
            }
            if(aa.getTotalHours() <= 1 || isNaN(aa.getTotalHours())) return;
            let trAA = document.createElement('tr');
            let tdType = document.createElement('td');
            tdType.textContent = aa.type;
            tdId = document.createElement('td');
            aid = document.createElement('a');
            aid.setAttribute('href', aa.href);
            aid.textContent = aa.id;
            tdId.appendChild(aid);
            tdName = document.createElement('td');
            aName = document.createElement('a');
            aName.setAttribute('href', aa.href);
            aName.textContent = aa.name;
            tdName.appendChild(aName);
            tdManager = document.createElement('td');
            tdManager.textContent = aa.manager;
            trAA.appendChild(tdType);
            trAA.appendChild(tdId);
            trAA.appendChild(tdName);
            trAA.appendChild(tdManager);
            let hours = document.createElement('td');
            hours.textContent = aa.getTotalHours() ;
            trAA.appendChild(hours);
            let totalUnits = document.createElement('td');
            totalUnits.textContent = aa.getTotalUnits();
            let totalUPH = document.createElement('td');
            totalUPH.textContent = (aa.getTotalUnits()/aa.getTotalHours()).toFixed(2);
            trAA.appendChild(totalUnits);
            trAA.appendChild(totalUPH);
            tbody.appendChild(trAA);
            table.appendChild(tbody);
            if(addbegining){
                for (let i = 0; i < blankspaces; i++) {
                    let empty = document.createElement('td');
                    empty.textContent = '';
                    trAA.appendChild(empty);
                }
            }
            let pathEntries = aa.jobs.entries();
            for (let [key,value] of pathEntries) {
                let hours = document.createElement('td');
                hours.textContent = aa.getHourByJob(key) ;
                trAA.appendChild(hours);
                let totalUnits = document.createElement('td');
                totalUnits.textContent = aa.getUnitsByJob(key);
                let totalUPH = document.createElement('td');
                totalUPH.textContent = (aa.getUnitsByJob(key)/aa.getHourByJob(key)).toFixed(2);
                trAA.appendChild(totalUnits);
                trAA.appendChild(totalUPH);
                let jobActions = value.entries();
                for (let [job,unit] of jobActions) {
                    let units = document.createElement('td');
                    units.textContent = unit.units;
                    let UPH = document.createElement('td');
                    UPH.textContent = unit.UPH;
                    trAA.appendChild(units);
                    trAA.appendChild(UPH);
                }
                if(addfinal){
                    for (let i = 0; i < blankspaces; i++) {
                        let empty = document.createElement('td');
                        empty.textContent = '';
                        trAA.appendChild(empty);
                    }
                }
            }
        });
    }
    function footerTable(){
    //element tfoot
    let tfoot = document.createElement('tfoot');
    let trFoot = document.createElement('tr');
    trFoot.setAttribute('class', 'total empl-all');
    let thFoot = document.createElement('th');
    thFoot.textContent = 'Total';
    thFoot.setAttribute('colspan', '4');
    thFoot.setAttribute('data-column', '0');
    // total elements   
    let totalHours = document.createElement('td');
    totalHours.setAttribute('data-column', '4');
    totalHours.textContent = cRetPSTable.associates.reduce((acc, cur) => {
        // Ensure that you return the accumulator after each iteration
        return isNaN(cur.getTotalHours()) ? acc + 0 : acc + parseFloat(cur.getTotalHours());
    }, 0).toFixed(2);
    let totalUnits = document.createElement('td');
    totalUnits.setAttribute('data-column', '5');
    totalUnits.textContent = cRetPSTable.associates.reduce((acc,cur)=>acc+parseFloat(cur.getTotalUnits()),0);
    let totalUPH = document.createElement('td');
    totalUPH.setAttribute('data-column', '6');
    totalUPH.textContent = (totalUnits.textContent/totalHours.textContent).toFixed(2) ;
    trFoot.appendChild(thFoot);
    trFoot.appendChild(totalHours);
    trFoot.appendChild(totalUnits);
    trFoot.appendChild(totalUPH);
    let jobsT = cRetPSTable.actionJobs.entries();
    let dataColumnT = 7;

    for (let [key,value] of jobsT) {
        let hours = document.createElement('td');
        hours.setAttribute('data-column', dataColumnT);
        hours.textContent = cRetPSTable.associates.reduce((acc,cur)=>{
           return isNaN(cur.getHourByJob(value.name)) ? acc+0 : acc+parseFloat(cur.getHourByJob(value.name));
        },0).toFixed(2);
        trFoot.appendChild(hours);
        value.jobs.forEach((job)=>{
            let totalUnits = document.createElement('td');
            totalUnits.setAttribute('data-column', dataColumnT+1);
            totalUnits.textContent = cRetPSTable.associates.reduce((acc,cur)=>{
                return isNaN(cur.getUnitsBySingleJob(value.name,job))?acc+=0:acc+cur.getUnitsBySingleJob(value.name,job);
            },0);
            let totalUPH = document.createElement('td');
            totalUPH.setAttribute('data-column', dataColumnT+2);
            totalUPH.textContent = (totalUnits.textContent/hours.textContent).toFixed(2);
            trFoot.appendChild(totalUnits);
            trFoot.appendChild(totalUPH);
            dataColumnT += 2;
        });
    }
    

    tfoot.appendChild(trFoot);
    table.appendChild(tfoot);
    }

    function render(){
        headerTable();
        bodyTable();
        footerTable();
        parent.insertBefore(table,parent.childNodes[40]) 
    }

    function orderByManager(){
        let associates = cRetPSTable.associates;
        associates.sort((a, b) => (a.manager > b.manager) ? 1 : -1);
        clearElement(table);
        render();
    }
    function orderByTotalUnits(){
        let associates = cRetPSTable.associates;
        associates.sort((a, b) => (a.getTotalUnits() < b.getTotalUnits()) ? 1 : -1);
        clearElement(table);
        render();
    }
    function orderByTotalHours(){
        let associates = cRetPSTable.associates;
        associates.sort((a, b) => (a.getTotalHours() > b.getTotalHours()) ? 1 : -1);
        clearElement(table);
        render();
    }
    function orderByUPH(){
        let associates = cRetPSTable.associates;
        let sortedAA = associates.sort((a, b) => (parseFloat(a.getTotalUPH()) < parseFloat(b.getTotalUPH())) ? 1 : -1);
        console.log(sortedAA);
        clearElement(table);
        render();
    }
    //render();
    //orderByManager();
    //orderByTotalUnits();
    //orderByTotalHours();
    orderByUPH();
})();
