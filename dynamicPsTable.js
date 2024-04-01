// ==UserScript==
// @name         Problem Solve Rate Table Summary
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Check AA rates
// @inject-into auto
// @author       Esteban Reyes
// @include       https://fclm-portal.amazon.com/reports/functionRollup?reportFormat=HTML&warehouseId=*&processId=1003058*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

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
            this.rate = 4;
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
            aid.setAttribute('href', aa.href.replace('timeDetails','activityDetails'));
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
            // parent node should be calculated
            parent.insertBefore(this.tableRender,parent.childNodes[39]) 
        
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
            this.renderSingleTable();
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
                if(aa.getUnitsByPath("ShipmentReturned") < 1 ){
                    aa.backGroundColor = '#ffff00';
                }else if(aa.getTotalUPH() < this.rate){
                    aa.backGroundColor = '#ff5931';
                }
                else{
                    aa.backGroundColor = '#7cfc00';
                }
            });
            clearElement(this.tableRender);
            this.renderSingleTable();
        }

    }


    function main() {
        const cRetPSTable = new AmazonAssociateTable('function-4300006654');
        cRetPSTable.renderSingleTable();
    }

    if (document.readyState === "loading") {
        // The document is still loading, so wait for the DOMContentLoaded event
        document.addEventListener("DOMContentLoaded", main);
    } else {
        // The document is already ready, so run the script immediately
        main();
    }

})();
