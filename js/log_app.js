const STATUS_PENDING_LOG    = "PENDING_LOG";
const STATUS_PROCESSING_LOG = "PROCESSING_LOG";
const STATUS_IDLE           = "IDLE";

// Replace all occurrences in a string
// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// Copy a string to clipboard
// https://techoverflow.net/2018/03/30/copying-strings-to-the-clipboard-using-pure-javascript/
function copyStringToClipboard (str) {
    var el = document.createElement('textarea');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style = {position: 'absolute', left: '-9999px'};
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

var logApp = {
    // Current status of the app
    status: null,

    // Log text
    logText: null,

    // Log text array
    logTextArray: [],

    // Date format
    dateFormat: '[d/m/Y, H:i:s]',

    // Initialize log app
    init: function() {
        // Set the application status
        logApp.setStatus(STATUS_PENDING_LOG);

        // Bind click listener to "paste log" button
        $('#pasteLogBtn').click(logApp.toggleLogPasteInput);

        // Bind click listener to "paste log" submit button
        $('#pasteLogSubmit').click(logApp.onSubmitPastedLog);

        // Bind click listener to "upload log" button
        $('#uploadLogBtn').click(logApp.showLogUploader);

        // Bind change listener to "upload log" input
        $('#logUploadInput').change(logApp.onLogUploaded);

        // Bind click listener to "close log" button
        $('#closeLogBtn').click(logApp.closeCurrentLog);

        // Bind click listener to "date settings" button
        $('#dateSettingsBtn').click(logApp.toggleDateSettings);

        // Bind click listener to "save date settings" button
        $('#saveDateSettingsBtn').click(logApp.saveDateSettings);

        // Bind change listener to apply filters
        $('.on-change-apply-filters').change(logApp.applyFilters);

        // Bind focus out listener to year filter
        $('#yearFilter').focusout(logApp.applyFilters);

        // Bind click listener to "clear filters" btn
        $('#clearFiltersBtn').click(logApp.clearFilters);

        // Bind click listener to "click to copy" btn
        $('#copyLogText').click(logApp.copyLogText);

        return true;
    },

    // Copy log to clipboard
    copyLogText: function() {
        var copyLogText = $('#copyLogText');

        copyStringToClipboard($('#logContainer').text());

        // Flash the copied text
        var oldText = copyLogText.text();
        copyLogText.text('[ copied ✅ ]');

        setTimeout(function() {
            copyLogText.text(oldText);
        }, 250);
        return true;
    },

    // Clear filters
    clearFilters: function() {
        $('#dayFilter').val('');
        $('#monthFilter').val('');
        $('#yearFilter').val('');
        $('#hourFilter').val('');
        $('#minuteFilter').val('');
        $('#secondFilter').val('');

        logApp.applyFilters();
        return true;
    },

    // Apply filters
    applyFilters: function() {
        var totalItems = logApp.logTextArray;
        var matchingItems = [];

        // Date filtering
        var dateFilterRegex = new RegExp(logApp.dateFormatToRegexRule());

        /*matchingItems = $.grep(matchingItems, function(logItem) {
            return dateFilterRegex.test(logItem);
        });*/

        for(var i = 0; i < totalItems.length; i++) {
            var currentItem = totalItems[i];
            var matches = totalItems[i].match(dateFilterRegex);

            // The string matches
            if(matches !== null && matches.length) {
                // Replace the matched date
                currentItem = currentItem.replaceAll(matches[0], '<span class="log-date">' + matches[0] + '</span>');

                matchingItems.push(currentItem);
            }
        }

        // Reverse list if is checked
        if($('#reverseResults').prop('checked'))
            matchingItems = matchingItems.reverse();


        // Update the log text with the matching items
        logApp.updateLogDisplayText(matchingItems);

        return true;
    },

    // Toggle the "date settings"
    toggleDateSettings: function() {
        $('#dateSettings').toggleClass('hidden');
        return true;
    },

    // Saves the "date settings"
    saveDateSettings: function() {
        logApp.dateFormat = $('#dateFormatInput').val();
        logApp.toggleDateSettings();
        return true;
    },

    // Toggle the "paste log" input
    toggleLogPasteInput: function() {
        $('#pasteLogArea').toggleClass('hidden');
        return true;
    },

    // Called when a pasted log is submitted
    onSubmitPastedLog: function() {
        var pastedLogString = $('#pasteLogTextarea').val();
        logApp.setLogText(pastedLogString);

        return true;
    },

    // Called when a log file is uploaded
    onLogUploaded: function() {
        logApp.setStatus(STATUS_PROCESSING_LOG);

        // Read the uploaded file using FileReader
        var fileToLoad = $('#logUploadInput')[0].files[0];

        var fileReader = new FileReader();
        fileReader.onload = function(fileLoadedEvent){
            logApp.setLogText(fileLoadedEvent.target.result);
        };

        fileReader.readAsText(fileToLoad, 'UTF-8');
    },

    // Assigns the log text to be used by the application
    setLogText: function(newLogText) {
        // Set the log text
        logApp.logText = newLogText;
        logApp.logTextArray = newLogText.split("\n");

        // Set status to idle
        logApp.setStatus(STATUS_IDLE);
        return true;
    },

    // Updates the displayed log text
    updateLogDisplayText: function(textArr) {
        var logContainer = $('#logContainer');

        logContainer.text('');

        for(var i = 0; i < textArr.length; i++) {
            logContainer.append(textArr[i] + '<br>');
        }

        logApp.updateLineCount(textArr);

        return true;
    },

    // Displays the upload window for uploading log files
    showLogUploader: function() {
        $('#logUploadInput').click();
        return true;
    },

    // Set the application status
    setStatus: function(status) {
        if(logApp.status !== status) {
            var oldStatus = logApp.status;
            logApp.status = status;

            logApp.onStatusChange(oldStatus, logApp.status);
        }

        return true;
    },

    // Called when application status changes
    onStatusChange: function(oldStatus, newStatus) {
        // Update status message
        $('#appStatus').text('status: ' + newStatus);

        // Hide all elements that don't match this status
        $("*[class*='ONLY_STATUS_']").not('.ONLY_STATUS_' + newStatus).hide();

        // Show elements for this status
        $('.ONLY_STATUS_' + newStatus).show();

        // Status became pending log
        if(newStatus === STATUS_PENDING_LOG) {
            // Update teaser text
            $('#logAppTeaserText').text('upload your log file to browse');

            // Clear filters because they may have been persisted from reloading the page
            logApp.clearFilters();
        }
        // Status became idle
        else if(newStatus === STATUS_IDLE) {
            var dateFormatSettingInput = $('#dateFormatInput');

            // Display the log text
            logApp.applyFilters();

            // Update the date format
            dateFormatSettingInput.val(logApp.dateFormat);

            // Update teaser text
            $('#logAppTeaserText').text('use the tools to browse your log file');
        }
        return true;
    },

    // Updates the displayed line count
    updateLineCount: function(textArray) {
        $('#logLineCount').text(textArray.length + ' lines found');
        return true;
    },

    // Generates a regex rule from the date format
    dateFormatToRegexRule: function() {
        var regexRule = logApp.dateFormat;

        // Escape all the slashes
        regexRule = regexRule.replaceAll('/', '\\/');

        // Escape all the block quotes
        regexRule = regexRule.replaceAll('[', '\\[');
        regexRule = regexRule.replaceAll(']', '\\]');

        // d specifier
        var dayFilter = $('#dayFilter').val();

        if(dayFilter === '') {
            // Day filter is disabled, allow all days
            regexRule = regexRule.replaceAll('d', '[0-9]{2}');
        } else {
            // Add 0 before the number
            var regexDay = ('0' + dayFilter).slice(-2);
            regexRule = regexRule.replaceAll('d', regexDay);
        }

        // m specifier
        var monthFilter = $('#monthFilter').val();

        if(monthFilter === '') {
            // Month filter is disabled, allow all months
            regexRule = regexRule.replaceAll('m', '[0-9]{2}');
        } else {
            // Add 0 before the number
            var regexMonth = ('0' + monthFilter).slice(-2);
            regexRule = regexRule.replaceAll('m', regexMonth);
        }

        // Y specifier
        var yearFilter = $('#yearFilter').val();

        if(yearFilter === '') {
            // Year filter is disabled, allow all years
            regexRule = regexRule.replaceAll('Y', '[0-9]{4}');
        } else {
            regexRule = regexRule.replaceAll('Y', yearFilter);
        }

        // H specifier
        var hourFilter = $('#hourFilter').val();

        if(hourFilter === '') {
            // Hour filter is disabled, allow all years
            regexRule = regexRule.replaceAll('H', '[0-9]{2}');
        } else {
            // Add 0 before the number
            var regexHour = ('0' + hourFilter).slice(-2);
            regexRule = regexRule.replaceAll('H', regexHour);
        }

        // i specifier
        var minuteFilter = $('#minuteFilter').val();

        if(minuteFilter === '') {
            // Minute filter is disabled, allow all years
            regexRule = regexRule.replaceAll('i', '[0-9]{2}');
        } else {
            // Add 0 before the number
            var regexMinute = ('0' + minuteFilter).slice(-2);
            regexRule = regexRule.replaceAll('i', regexMinute);
        }

        // s specifier
        var secondsFilter = $('#secondFilter').val();

        if(secondsFilter === '') {
            // Seconds filter is disabled, allow all years
            regexRule = regexRule.replaceAll('s', '[0-9]{2}');
        } else {
            // Add 0 before the number
            var regexSeconds = ('0' + secondsFilter).slice(-2);
            regexRule = regexRule.replaceAll('s', regexSeconds);
        }

        return '(' + regexRule + ')';
    },

    // Prompts to close the current log
    closeCurrentLog: function() {
        if(confirm('Are you sure you wish to close the current log?')) {
            logApp.logText = null;
            logApp.setStatus(STATUS_PENDING_LOG);
            return true;
        }

        return false;
    }
};