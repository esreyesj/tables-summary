// ==UserScript==
// @name         Problem Solve Rate Summary Table
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  try to take over the world!
// @author       Esteban Reyes
// @inject-into auto
// @include       https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=*&processId=1003058*
// @include       https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=*&processId=1003060*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.dev
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    // This function clears the element
    function clearElement(element){
        //delete all children from element
        element.remove();
    }
    // Amazaon Associate Class
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
            this.backGroundColor = 'none';
        }
        // This method itinerates over the jobs and returns the total units
        getTotalUnits() {
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
        // This method itinerates over and returns the total units in a especific job
        getUnitsByJob(job) {
            let total = 0;
            if(!this.jobs.get(job))return 0;
            let entries = this.jobs.get(job).entries();
            for (let [key,value] of entries) {
                value.units === '' ? total += 0 :
                total += parseInt(value.units);
            }
            return total;
        }
        // This method itinerates over and returns the total units in a especific path
        getUnitsByPath(path) {
            let total = 0;
            this.jobs.get(this.path).get(path).units === '' ? total += 0 :
                total += parseInt(this.jobs.get(this.path).get(path).units);
            return total;
        }
        getJobUnitsFromPath(path){
            let total = 0;
            let entries = this.jobs.entries();
            for (let [key,value] of entries) {
                //add to the total when the path is equal to the one we are looking for
                if(value.get(path)) {
                    value.get(path).units === '' ? total += 0 :
                    total += parseInt(value.get(path).units);
                }
            }
            return total;
        }
        // This method itinerates over and returns the total units in a especific job and path
        getUnitsBySingleJob(job,path) { 
            let total = 0;
            if(path === 'Total') return  this.getUnitsByJob(job)
            if(!this.jobs.get(job))return 0;
            let entries = this.jobs.get(job).get(path).units;
            entries === '' ? total += 0 :total += parseInt(entries);
            return total;
        }
        // This method itinerates over and returns the total hours in a especific job
        getHourByJob(job) {
            if (!this.hours.get(job)) return 0;
            return this.hours.get(job).hours;
        }
        // Gets the total units per hour
        getTotalUPH() {
            if(!this.getTotalHours())return 0;
            return (this.getTotalUnits()/this.getTotalHours()).toFixed(2);
        }
        // Gets the total hours
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
        // This method creates a map with the jobs and their units and UPH
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
 
    // Table Class full of AAs
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
            this.curhours = 0.5;
            this.rate = 5;
            this.fillAssociates();
            this.ascManager = false;
            this.ascHours = false;
            this.ascUnits = false;
            this.ascUPH = false;
            this.ascPathUnits = false;
            this.ascPathUPH = false;
            this.ascName = false;
            this.ascID = false;
            this.ascType = false;
            this.addTable = false;
            this.rateChecked = false;
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
        // in case we need to merge two tables
        mergeTables(secondTable){
            if(this.addTable) return;
            this.addTable = true;
            this.actionJobs.push({name:secondTable.caption.childNodes[0].textContent.replace(/\n/g, ''),jobs:secondTable.actionJobs[0].jobs});
            secondTable.associates.forEach((emp)=>{
                let exist = this.associates.some(obj => obj.id === emp.id);
                if(exist){
                    let associate = this.associates.find(obj => obj.id === emp.id);
                    associate.hours.set(emp.path,{'hours':emp.hours.get(emp.path).hours});
                    associate.jobs.set(emp.path,emp.jobs.get(emp.path));
                }else{
                    emp.hours.set(this.caption.childNodes[0].textContent.replace(/\n/g, ''),{'hours':0});
                    let newJobMapping = new Map();
                    let jobActions = this.actionJobs[0].jobs;
                    jobActions.forEach((job)=>{
                        newJobMapping.set(job,{'units':'','UPH':''});
                    });
                    emp.jobs.set(this.caption.childNodes[0].textContent.replace(/\n/g, ''),newJobMapping);
                    this.associates.push(emp);
                }
            })
            this.associates.forEach((emp)=>{
                if(emp.jobs.size === 1){
                    let newJobMapping = new Map();
                    let jobActions = this.actionJobs[1].jobs;
                    jobActions.forEach((job)=>{
                        newJobMapping.set(job,{'units':'','UPH':''});
                    });
                    emp.jobs.set(secondTable.caption.childNodes[0].textContent.replace(/\n/g, ''),newJobMapping);
                }
                this.rateChecked?this.checkRates():null;
            });
        }
        // create the header of the table
        createHeaderTable(name){
            this.tableRender.className = 'sortable result-table align-left tablesorter tablesorter-default tablesorter2ef6169fcbdc2';
            this.tableRender.id = 'sumaryTable';
            //element caption
            let caption = document.createElement('caption');
            caption.textContent = `${name} Summary`;
            //element span filter
            let span = document.createElement('span');
            span.className = 'filter highlightfilter singlefilter togglefilter';
            // rate input
            let spanConfig = document.createElement('span');
            spanConfig.className = 'filteroption selected';
            spanConfig.id = 'config';
            spanConfig.appendChild(renderConfigurationSVG());
            //Todo configuration
            let inputRate = document.createElement('input');
                inputRate.type = 'text';
                inputRate.id = 'inputRate';
                inputRate.placeholder = 'Rate';
                inputRate.style.width = '3vw';
                inputRate.style.marginLeft = '3vw';
            // submit button
            let spanButtonRate = document.createElement('span');
                spanButtonRate.className = 'filteroption selected';
                spanButtonRate.style.marginLeft = '0.2em';
                spanButtonRate.textContent = 'Check Rates';
                spanButtonRate.addEventListener('click', () => {this.checkRates();});
                caption.appendChild(inputRate);
                caption.appendChild(spanButtonRate);
            if(this.tableID === 'function-4300006654'){
                let spanMergeTable = document.createElement('span');
                spanMergeTable.className = 'filteroption selected';
                spanMergeTable.style.marginLeft = '0.2em';
                spanMergeTable.textContent = 'Add Add-Ins Table';
                spanMergeTable.addEventListener('click', () => {this.addAATable(new AmazonAssociateTable('function-1599235212848'));});
                caption.appendChild(spanMergeTable);
            }else if(this.tableID === 'function-1599235212848'){
                let spanMergeTable = document.createElement('span');
                spanMergeTable.className = 'filteroption selected';
                spanMergeTable.style.marginLeft = '0.2em';
                spanMergeTable.textContent = 'Add Problem Solve Table';
                spanMergeTable.addEventListener('click', () => {this.addAATable(new AmazonAssociateTable('function-4300006654'));});
                caption.appendChild(spanMergeTable);
            }

            //add caption to table
            this.tableRender.appendChild(caption);

            //element thead
            let theadInfoAA = document.createElement('thead');
            //element tr

            let basicInfo = document.createElement('tr');
            basicInfo.className = 'tablesorter-headerRow';
            //element th
            const info = ['Type','ID','Name','Manager'];
            info.forEach((el,index)=>{
                let type = document.createElement('th');
                type.className = 'tablesorter-sortableHeader tablesorter-header tablesorter-headerUnSorted'
                type.id = el;
                let auxDiv = document.createElement('div');
                auxDiv.className = 'tablesorter-header-inner';
                auxDiv.textContent = el;
                auxDiv.addEventListener('click', () => {
                   if(el==='Manager') this.orderByManager();
                   else if(el==='Name') this.orderByName();
                   else if(el==='ID') this.orderByID();
                   else if(el==='Type') this.orderByType();
                });
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
            sumaryElement.className = 'job-action';
            sumaryElement.setAttribute('colspan', 3);
            sumaryElement.setAttribute('rowspan', 2);
            sumaryElement.setAttribute('data-column', 4);
            basicInfo.appendChild(sumaryElement);
            for (let [key,value] of tablesInfo) {
                let dataColumn = 7;
                let tableJobsLength = value.jobs.length;
                let tableName = document.createElement('th');
                tableName.textContent = value.name;
                tableName.setAttribute('class', 'job-action');
                tableName.setAttribute('colspan', (tableJobsLength*2));
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
            const summaryArray = ["Hours","Units","UPH"]
            summaryArray.forEach((el)=>{
                let summary = document.createElement('th');
                summary.className = 'tablesorter-sortableHeader tablesorter-header tablesorter-headerUnSorted';
                summary.id = el;
                let auxDiv = document.createElement('div');
                auxDiv.className = 'tablesorter-header-inner';
                auxDiv.textContent = el;
                summary.appendChild(auxDiv);
                summary.setAttribute('data-column', dataColumn);
                if(el === 'Hours') summary.addEventListener('click', ()=>{this.orderByTotalHours()});
                else if(el === 'Units') summary.addEventListener('click', ()=>{this.orderByTotalUnits()});
                else if(el === 'UPH') summary.addEventListener('click', ()=>{this.orderByUPH()});
                dataColumn += 1;
                unitsUPH.appendChild(summary);
            });
            for (let [key,value] of jobs) {
                value.jobs.forEach((job)=>{
                    let jobName = document.createElement('th');
                    jobName.textContent = job;
                    jobName.className = 'job-action';
                    jobName.setAttribute('data-column', dataColumn);
                    jobName.setAttribute('colspan', 2);
                    jobsRow.appendChild(jobName);
                    const jobArray = ["Units","UPH"];
                    jobArray.forEach((el)=>{
                        let pointer = document.createElement('th');
                        let auxPointer = document.createElement('div');
                        auxPointer.textContent = el;
                        auxPointer.className = 'tablesorter-header-inner';
                        pointer.appendChild(auxPointer);
                        pointer.className = 'tablesorter-sortableHeader tablesorter-header tablesorter-headerUnSorted';
                        pointer.id = `${job}${el}`;
                        pointer.setAttribute('data-column', dataColumn);
                        el === 'Units' ? pointer.addEventListener('click', ()=>{this.orderByPathUnits(job)}):
                        pointer.addEventListener('click', ()=>{this.orderByPathUPH(job)});
                        dataColumn += 1;
                        unitsUPH.appendChild(pointer);

                    });
                });
            }
            theadInfoAA.appendChild(jobsRow);
            theadInfoAA.appendChild(unitsUPH );
            this.tableRender.appendChild(theadInfoAA);
            
        }
        createBodyTable(){
            let tbody = document.createElement('tbody');
            this.associates.forEach((aa)=>{
                if(aa.getTotalHours() <= this.curhours || isNaN(aa.getTotalHours())) return;
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
                    aName.setAttribute('href', aa.href.replace('timeDetails','activityDetails'));
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
                    totalUPH.style.backgroundColor = aa.backGroundColor;
                    totalUPH.textContent = (aa.getTotalUnits()/aa.getTotalHours()).toFixed(2);
                    trAA.appendChild(totalUnits);
                    trAA.appendChild(totalUPH);
                    tbody.appendChild(trAA);
                    this.tableRender.appendChild(tbody);
                   this.actionJobs.forEach((job)=>{ 
                        let pathEntries = aa.jobs.get(job.name).entries();
                        for (let [job,unit] of pathEntries) {
                            let units = document.createElement('td');
                            units.textContent = unit.units;
                            let UPH = document.createElement('td');
                            UPH.textContent = unit.UPH;
                            trAA.appendChild(units);
                            trAA.appendChild(UPH);
                        }
                    });
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
            let pointerIndex = null;
            parent.childNodes.forEach((elem,index) =>{
                elem.id === this.tableID?pointerIndex = index:null;
            }) 
            this.tableRender = document.createElement('table');
            this.createHeaderTable(this.associates[0].path);
            this.createBodyTable();
            this.footerTable();
            parent.insertBefore(this.tableRender,parent.childNodes[pointerIndex+1]); 
        
        }
        toggleAscDesc(booleanAcs){
            return booleanAcs ? 'tablesorter-sortableHeader tablesorter-header tablesorter-headerAsc' 
            : 'tablesorter-sortableHeader tablesorter-header tablesorter-headerDesc';
        }

        orderByUPH(){
            !this.ascUPH?
            this.associates.sort((a, b) => (parseFloat(a.getTotalUPH()) < parseFloat(b.getTotalUPH())) ? 1 : -1):
            this.associates.sort((a, b) => (parseFloat(a.getTotalUPH()) > parseFloat(b.getTotalUPH())) ? 1 : -1);
            this.ascUPH = !this.ascUPH;
            clearElement(this.tableRender);
            this.renderSingleTable();
            const element = document.querySelector('#UPH');
            element.className = this.toggleAscDesc(this.ascUPH);
        }
        orderByName(){
            !this.ascName?
            this.associates.sort((a, b) => (a.name > b.name) ? 1 : -1):
            this.associates.sort((a, b) => (a.name < b.name) ? 1 : -1);
            this.ascName = !this.ascName;
            clearElement(this.tableRender);
            this.renderSingleTable();
            const element = document.querySelector('#Name');
            this.ascManager? element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerAsc':
            element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerDesc';
        }
        orderByManager(){
            !this.ascManager?
            this.associates.sort((a, b) => (a.manager > b.manager) ? 1 : -1):
            this.associates.sort((a, b) => (a.manager < b.manager) ? 1 : -1);
            this.ascManager = !this.ascManager;
            clearElement(this.tableRender);
            this.renderSingleTable();
            const element = document.querySelector('#Manager');
            this.ascManager? element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerAsc':
            element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerDesc';
        }
        orderByID(){
            !this.ascID?
            this.associates.sort((a, b) => (a.id > b.id) ? 1 : -1):
            this.associates.sort((a, b) => (a.id < b.id) ? 1 : -1);
            this.ascID = !this.ascID;
            clearElement(this.tableRender);
            this.renderSingleTable();
            const element = document.querySelector('#ID');
            this.ascManager? element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerAsc':
            element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerDesc';
        }
        orderByTotalUnits(){
            !this.ascUnits?
            this.associates.sort((a, b) => (a.getTotalUnits() < b.getTotalUnits()) ? 1 : -1):
            this.associates.sort((a, b) => (a.getTotalUnits() > b.getTotalUnits()) ? 1 : -1);
            this.ascUnits = !this.ascUnits;
            clearElement(this.tableRender);
            this.renderSingleTable();
            const element = document.querySelector('#Units');
            this.ascUnits? element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerAsc':
            element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerDesc';
        }
        orderByTotalHours(){
            !this.ascHours?
            this.associates.sort((a, b) => (parseFloat(a.getTotalHours()) < parseFloat(b.getTotalHours())) ? 1 : -1):
            this.associates.sort((a, b) => (parseFloat(a.getTotalHours()) > parseFloat(b.getTotalHours())) ? 1 : -1);
            this.ascHours = !this.ascHours;
            clearElement(this.tableRender);
            this.renderDoubleTable();
            const element = document.querySelector('#Hours');
            this.ascHours? element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerAsc':
            element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerDesc';
        }
        orderByPathUnits(path){
            this.ascPathUnits?
            this.associates.sort((a, b) => (a.getUnitsByPath(path) < b.getUnitsByPath(path)) ? 1 : -1):
            this.associates.sort((a, b) => (a.getUnitsByPath(path) > b.getUnitsByPath(path)) ? 1 : -1);
            this.ascPathUnits = !this.ascPathUnits;
            clearElement(this.tableRender);
            this.renderSingleTable();
            const element = document.querySelector(`#${path}Units`);
            this.ascPathUnits? element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerAsc':
            element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerDesc';
        }
        orderByPathUPH(path){
            this.ascPathUPH?
            this.associates.sort((a, b) => (parseFloat(a.getUnitsByPath(path)/a.getTotalHours()) < parseFloat(b.getUnitsByPath(path)/b.getTotalHours())) ? 1 : -1):
            this.associates.sort((a, b) => (parseFloat(a.getUnitsByPath(path)/a.getTotalHours()) > parseFloat(b.getUnitsByPath(path)/b.getTotalHours())) ? 1 : -1);
            this.ascPathUPH = !this.ascPathUPH;
            clearElement(this.tableRender);
            this.renderSingleTable();
            const element = document.querySelector(`#${path}UPH`);
            this.ascPathUPH? element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerAsc':
            element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerDesc';
        }
        orderByType(){
            this.ascType?
            this.associates.sort((a, b) => (a.type > b.type) ? 1 : -1):
            this.associates.sort((a, b) => (a.type < b.type) ? 1 : -1);
            clearElement(this.tableRender);
            this.renderSingleTable();
            const element = document.querySelector('#Type');
            this.ascType? element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerAsc':
            element.className ='tablesorter-sortableHeader tablesorter-header tablesorter-headerDesc';
        }
        checkRates(){
            this.rate = parseInt(document.querySelector('#inputRate').value)?parseInt(document.querySelector('#inputRate').value):this.rate;
            this.associates.forEach((aa)=>{
                if(aa.getJobUnitsFromPath("ShipmentReturned") < 1 ){
                    aa.backGroundColor = '#ffff00';
                }else if(aa.getTotalUPH() < this.rate){
                    aa.backGroundColor = '#ff5931';
                }
                else{
                    aa.backGroundColor = '#7cfc00';
                }
            });
            clearElement(this.tableRender);
            this.rateChecked = true;
            this.renderSingleTable();
        }
        addAATable(AAtable){
            this.mergeTables(AAtable);
            clearElement(this.tableRender);
            this.renderSingleTable();
        }
        // This method creates a table to configure the rate and the hour cutoff of the associates
          createConfigTable(span){
            let configContainer = document.createElement('div');
            configContainer.id = 'dragbox';
            configContainer.style.border = '1px solid #ccc';
            configContainer.style.padding = '10px';
            configContainer.style.width = '5vw';
            configContainer.style.backgroundColor = '#ffffff';
            configContainer.style.display = 'flex'; // Hide by default
            configContainer.style.position = 'absolute';
            configContainer.style.zIndex = '1';
            configContainer.style.right = '50%';
            configContainer.style.flexDirection = 'column';
            configContainer.style.alignItems = 'center';

            // Create rate input
            let rateInput = document.createElement('input');
            rateInput.type = 'text';
            rateInput.placeholder = 'Rate';
            rateInput.style.width = '3vw';
            rateInput.style.marginBottom = '10px';

            // Create hour cutoff input
            let hourCutoffInput = document.createElement('input');
            hourCutoffInput.type = 'text';
            hourCutoffInput.placeholder = 'COH';
            hourCutoffInput.style.width = '3vw';
            hourCutoffInput.style.marginBottom = '10px';
            // createa div to display both buttons inline
            let divButtons = document.createElement('div');
            divButtons.style.display = 'flex';
            divButtons.style.justifyContent = 'space-between';
            divButtons.style.marginBottom = '10px';
            divButtons.style.flexDirection = 'row';


            let submitButton = document.createElement('span');
            submitButton.textContent = 'Submit';

            // Create close button
            let closeButton = document.createElement('span');
            closeButton.textContent = 'Close';
            closeButton.addEventListener('click', () => {this.hideConfigTable()} );
            divButtons.appendChild(submitButton);
            divButtons.appendChild(closeButton);

            // Append inputs and buttons to container
            configContainer.appendChild(rateInput);
            configContainer.appendChild(hourCutoffInput);
            configContainer.appendChild(divButtons);
            // Append container to the provided span element
            span.appendChild(configContainer);
        }
        hideConfigTable() {
            var element = document.querySelector('#dragbox');
            console.log(element);
            element.remove();
        }
          
    }
    // config icon SVG
    function renderConfigurationSVG() {
        const svgNS = 'http://www.w3.org/2000/svg';
        const xlinkNS = 'http://www.w3.org/1999/xlink';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttributeNS(null, 'width', '16');
        svg.setAttributeNS(null, 'viewBox', '0 0 30 30');
    
        // Create first path element
        const path1 = document.createElementNS(svgNS, 'path');
        path1.setAttributeNS(null, 'd', 'M 15 2 C 14.448 2 14 2.448 14 3 L 14 3.171875 C 14 3.649875 13.663406 4.0763437 13.191406 4.1523438 C 12.962406 4.1893437 12.735719 4.2322031 12.511719 4.2832031 C 12.047719 4.3892031 11.578484 4.1265 11.396484 3.6875 L 11.330078 3.53125 C 11.119078 3.02125 10.534437 2.7782344 10.023438 2.9902344 C 9.5134375 3.2012344 9.2704219 3.785875 9.4824219 4.296875 L 9.5488281 4.4570312 C 9.7328281 4.8970313 9.5856875 5.4179219 9.1796875 5.6699219 C 8.9836875 5.7919219 8.7924688 5.9197344 8.6054688 6.0527344 C 8.2174688 6.3297344 7.68075 6.2666875 7.34375 5.9296875 L 7.2226562 5.8085938 C 6.8316562 5.4175937 6.1985937 5.4175938 5.8085938 5.8085938 C 5.4185938 6.1995938 5.4185938 6.8326563 5.8085938 7.2226562 L 5.9296875 7.34375 C 6.2666875 7.68075 6.3297344 8.2164688 6.0527344 8.6054688 C 5.9197344 8.7924687 5.7919219 8.9836875 5.6699219 9.1796875 C 5.4179219 9.5856875 4.8960781 9.7337812 4.4550781 9.5507812 L 4.296875 9.484375 C 3.786875 9.273375 3.2002813 9.5153906 2.9882812 10.025391 C 2.7772813 10.535391 3.0192969 11.120031 3.5292969 11.332031 L 3.6855469 11.396484 C 4.1245469 11.578484 4.3892031 12.047719 4.2832031 12.511719 C 4.2322031 12.735719 4.1873906 12.962406 4.1503906 13.191406 C 4.0753906 13.662406 3.649875 14 3.171875 14 L 3 14 C 2.448 14 2 14.448 2 15 C 2 15.552 2.448 16 3 16 L 3.171875 16 C 3.649875 16 4.0763437 16.336594 4.1523438 16.808594 C 4.1893437 17.037594 4.2322031 17.264281 4.2832031 17.488281 C 4.3892031 17.952281 4.1265 18.421516 3.6875 18.603516 L 3.53125 18.669922 C 3.02125 18.880922 2.7782344 19.465563 2.9902344 19.976562 C 3.2012344 20.486563 3.785875 20.729578 4.296875 20.517578 L 4.4570312 20.451172 C 4.8980312 20.268172 5.418875 20.415312 5.671875 20.820312 C 5.793875 21.016313 5.9206875 21.208484 6.0546875 21.396484 C 6.3316875 21.784484 6.2686406 22.321203 5.9316406 22.658203 L 5.8085938 22.779297 C 5.4175937 23.170297 5.4175938 23.803359 5.8085938 24.193359 C 6.1995938 24.583359 6.8326562 24.584359 7.2226562 24.193359 L 7.3457031 24.072266 C 7.6827031 23.735266 8.2174688 23.670266 8.6054688 23.947266 C 8.7934688 24.081266 8.9856406 24.210031 9.1816406 24.332031 C 9.5866406 24.584031 9.7357344 25.105875 9.5527344 25.546875 L 9.4863281 25.705078 C 9.2753281 26.215078 9.5173438 26.801672 10.027344 27.013672 C 10.537344 27.224672 11.121984 26.982656 11.333984 26.472656 L 11.398438 26.316406 C 11.580438 25.877406 12.049672 25.61275 12.513672 25.71875 C 12.737672 25.76975 12.964359 25.814562 13.193359 25.851562 C 13.662359 25.924562 14 26.350125 14 26.828125 L 14 27 C 14 27.552 14.448 28 15 28 C 15.552 28 16 27.552 16 27 L 16 26.828125 C 16 26.350125 16.336594 25.923656 16.808594 25.847656 C 17.037594 25.810656 17.264281 25.767797 17.488281 25.716797 C 17.952281 25.610797 18.421516 25.8735 18.603516 26.3125 L 18.669922 26.46875 C 18.880922 26.97875 19.465563 27.221766 19.976562 27.009766 C 20.486563 26.798766 20.729578 26.214125 20.517578 25.703125 L 20.451172 25.542969 C 20.268172 25.101969 20.415312 24.581125 20.820312 24.328125 C 21.016313 24.206125 21.208484 24.079312 21.396484 23.945312 C 21.784484 23.668312 22.321203 23.731359 22.658203 24.068359 L 22.779297 24.191406 C 23.170297 24.582406 23.803359 24.582406 24.193359 24.191406 C 24.583359 23.800406 24.584359 23.167344 24.193359 22.777344 L 24.072266 22.654297 C 23.735266 22.317297 23.670266 21.782531 23.947266 21.394531 C 24.081266 21.206531 24.210031 21.014359 24.332031 20.818359 C 24.584031 20.413359 25.105875 20.264266 25.546875 20.447266 L 25.705078 20.513672 C 26.215078 20.724672 26.801672 20.482656 27.013672 19.972656 C 27.224672 19.462656 26.982656 18.878016 26.472656 18.666016 L 26.316406 18.601562 C 25.877406 18.419563 25.61275 17.950328 25.71875 17.486328 C 25.76975 17.262328 25.814562 17.035641 25.851562 16.806641 C 25.924562 16.337641 26.350125 16 26.828125 16 L 27 16 C 27.552 16 28 15.552 28 15 C 28 14.448 27.552 14 27 14 L 26.828125 14 C 26.350125 14 25.923656 13.663406 25.847656 13.191406 C 25.810656 12.962406 25.767797 12.735719 25.716797 12.511719 C 25.610797 12.047719 25.8735 11.578484 26.3125 11.396484 L 26.46875 11.330078 C 26.97875 11.119078 27.221766 10.534437 27.009766 10.023438 C 26.798766 9.5134375 26.214125 9.2704219 25.703125 9.4824219 L 25.542969 9.5488281 C 25.101969 9.7318281 24.581125 9.5846875 24.328125 9.1796875 C 24.206125 8.9836875 24.079312 8.7915156 23.945312 8.6035156 C 23.668312 8.2155156 23.731359 7.6787969 24.068359 7.3417969 L 24.191406 7.2207031 C 24.582406 6.8297031 24.582406 6.1966406 24.191406 5.8066406 C 23.800406 5.4156406 23.167344 5.4156406 22.777344 5.8066406 L 22.65625 5.9296875 C 22.31925 6.2666875 21.782531 6.3316875 21.394531 6.0546875 C 21.206531 5.9206875 21.014359 5.7919219 20.818359 5.6699219 C 20.413359 5.4179219 20.266219 4.8960781 20.449219 4.4550781 L 20.515625 4.296875 C 20.726625 3.786875 20.484609 3.2002812 19.974609 2.9882812 C 19.464609 2.7772813 18.879969 3.0192969 18.667969 3.5292969 L 18.601562 3.6855469 C 18.419563 4.1245469 17.950328 4.3892031 17.486328 4.2832031 C 17.262328 4.2322031 17.035641 4.1873906 16.806641 4.1503906 C 16.336641 4.0753906 16 3.649875 16 3.171875 L 16 3 C 16 2.448 15.552 2 15 2 z M 15 7 C 19.078645 7 22.438586 10.054876 22.931641 14 L 16.728516 14 A 2 2 0 0 0 15 13 A 2 2 0 0 0 14.998047 13 L 11.896484 7.625 C 12.850999 7.222729 13.899211 7 15 7 z M 10.169922 8.6328125 L 13.269531 14 A 2 2 0 0 0 13 15 A 2 2 0 0 0 13.269531 15.996094 L 10.167969 21.365234 C 8.2464258 19.903996 7 17.600071 7 15 C 7 12.398945 8.2471371 10.093961 10.169922 8.6328125 z M 16.730469 16 L 22.931641 16 C 22.438586 19.945124 19.078645 23 15 23 C 13.899211 23 12.850999 22.777271 11.896484 22.375 L 14.998047 17 A 2 2 0 0 0 15 17 A 2 2 0 0 0 16.730469 16 zz');
        svg.appendChild(path1);
        return svg;
    }

    function main() {
        let tableArrays = ['function-4300006654','function-1599235212848','function-4300006896'];
        tableArrays.forEach((table)=>{
            const element = document.querySelector(`#${table}`);
            element ? (new AmazonAssociateTable(table)).renderSingleTable() : null;
        });
    }

    if (document.readyState === "loading") {
        // The document is still loading, so wait for the DOMContentLoaded event
        document.addEventListener("DOMContentLoaded", main);
    } else {
        // The document is already ready, so run the script immediately
        main();
    }
})();
