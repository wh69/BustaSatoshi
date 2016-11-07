/** Credits - Do not edit/remove this comment (Read http://bustasatoshi.xyz/LICENSE)
 * @desc bustasatoshi.xyz core source file
 * @author Dexon <dexon@live.ca> (https://github.com/Dexon95)
 * @contributors 
 */

 var app = {
    id: 1280
 }

 var user = {
    connected: false,
    token: null,
    uname: null,
    balance: null,
    clientSeed: null,
    hash: null
 }

var showingrecaptcha = false;

function onloadCallback() {
    grecaptcha.render('faucetClaimCaptcha', {
        'sitekey' : '6LeBXiMTAAAAAI_ie_sYrUMYUEI5d9dKyOzYbaa7',
        'callback' : correctCaptcha
    });
};

var AutoRunning = false;
var betting = false;

$(function(){
    if(getURLParameter('access_token')!="" && getURLParameter('access_token')!=null){
        login(getURLParameter('access_token'));
    }

    $("#faucetButton").click(function(){
        if(showingrecaptcha == false){
            $("#faucetClaimCaptcha").css("top", "10px");
            showingrecaptcha = true;
            console.log("showing google recaptcha");
        }else if(showingrecaptcha == true){
            $("#faucetClaimCaptcha").css("top", "-90px");
            showingrecaptcha = false;
            console.log("hiding google recaptcha");
        }
    });

    $('#depositButton').click(function(){
        var windowUrl = 'https://moneypot.com/dialog/deposit?app_id='+app.id;
        var windowName = 'manage-auth';
        var windowOpts = 'width=420,height=350,left=100,top=100';
        var windowRef = window.open(windowUrl, windowName, windowOpts);
        windowRef.focus();
    });

    $('#withdrawButton').click(function(){
        var windowUrl = 'https://moneypot.com/dialog/withdraw?app_id='+app.id;
        var windowName = 'manage-auth';
        var windowOpts = 'width=420,height=350,left=100,top=100';
        var windowRef = window.open(windowUrl, windowName, windowOpts);
        windowRef.focus();
    });

    window.addEventListener('message', function(event) {
        if (event.origin === 'https://moneypot.com' && event.data === 'UPDATE_BALANCE') {
            $.getJSON("https://api.moneypot.com/v1/auth?access_token="+user.token, function(json){
                user.balance = json.user.balance/100;
                $('#balance').text((user.balance).formatMoney(2,'.',','));  
            });
        }
    }, false);

    $('#autoTabButton').click(function(){
        $('#manualTab').css("display", "none");
        $('#manualTabButton').removeClass("selected");
        $('#autoTab').css("display", "block");
        $('#autoTabButton').addClass("selected");
        $('#bet_cashout_button').css("display", "none");
    });
    $('#manualTabButton').click(function(){
        if(AutoRunning) return;
        $('#autoTab').css("display", "none");
        $('#autoTabButton').removeClass("selected");
        $('#manualTab').css("display", "block");
        $('#manualTabButton').addClass("selected");
        $('#bet_cashout_button').css("display", "block");
    });

    $('#autoBet_button').click(function(){
        if(!user.connected){
            window.location.href = "https://moneypot.com/oauth/authorize?app_id=1280&response_type=token&state=Meh&redirect_uri=http://bustasatoshi.xyz";
            return;
        }
        if(AutoRunning){
            AutoRunning = false;
            $('#autoBet_button').text("Run");

            $('#auto_bet_input').attr("disabled", false);
            $('#auto_cashout_input').attr("disabled", false);
            $('#auto_increase_on_loss_input').attr("disabled", false);
        }else{ 
            if(betting) return;
            AutoRunning = true;
            $('#autoBet_button').text("Stop");
            placeBet( parseFloat($('#auto_cashout_input').val()), parseFloat($('#auto_bet_input').val()) );
        }
    });
});

function login(token){
    window.history.pushState('', 'bustasatoshi', '/');

    var loaderContainer = jQuery('<div/>', {
        id:     'loaderContainer',
        style:  "position: absolute;"+
                "top: 0; right: 0; bottom: 0; left: 0;"+
                "z-index: 2000;"
    }).appendTo('body');
    
    var loaderSegment = jQuery('<div/>', {
        class:  'ui segment',
        style:  'height: 100%; opacity: 0.7;'
    }).appendTo(loaderContainer);
    
    var loaderDimmer = jQuery('<div/>', {
        class:  'ui active dimmer'
    }).appendTo(loaderSegment);
    
    var loaderText = jQuery('<div/>', {
        id:     'loaderText',
        class:  'ui text loader',
        text:   'Connecting'
    }).appendTo(loaderDimmer);

    $.getJSON("https://api.moneypot.com/v1/token?access_token="+token, function(json){
        if(json.error){
            console.error("LOGIN ERROR:", json.error);
            $('#loaderText').text('Error while connecting: '+ json.error);
            return;
        }

        user.uname = json.auth.user.uname;
        user.balance = json.auth.user.balance/100;
        user.connected = true;
        user.token = token;
        user.clientSeed = getRandCseed();

        $('#username').text(user.uname);
        $('#balance').text((user.balance).formatMoney(2,'.',','));
        $('#bet_cashout_button').text("Bet");

        $('#loaderContainer').css('display', 'none');
        $('#userinfo').css("display", "block");
        $('#login').css("display", "none");

        $('#bet_input').attr("disabled", false);
        $('#cashout_input').attr("disabled", false);
        $('#auto_bet_input').attr("disabled", false);
        $('#auto_cashout_input').attr("disabled", false);
        $('#auto_increase_on_loss_input').attr("disabled", false);
    });
}

function getHash(callback){
    if(user.hash == null){
        $.post("https://api.moneypot.com/v1/hashes?access_token="+user.token, '', function(json) {
            if(json.hash){
                console.log("[Provably fair] We received our hash: "+json.hash);
                user.hash = (typeof json.hash === "undefined"?null:json.hash);
                if(callback) callback();
            }else{
                console.error("HASH ERROR:",json);
                $('#bet_cashout_button').text("Bet");

                $('#loaderContainer').css('display', 'none');
                $('#userinfo').css("display", "block");
                $('#login').css("display", "none");

                $('#bet_input').attr("disabled", false);
                $('#cashout_input').attr("disabled", false);
                $('#auto_bet_input').attr("disabled", false);
                $('#auto_cashout_input').attr("disabled", false);
                $('#auto_increase_on_loss_input').attr("disabled", false);
                return;
            }
        });
    }else{
        if(callback) callback();
    }
}

$('#bet_cashout_button').click(function(){
    if(!user.connected){
        window.location.href = "https://moneypot.com/oauth/authorize?app_id=1280&response_type=token&state=Meh&redirect_uri=http://bustasatoshi.xyz";
        return;
    }
    if(!betting){
        placeBet( parseFloat($('#cashout_input').val()), parseFloat($('#bet_input').val()) );
    }
});

var currentAt = 0;
function placeBet(stopAt, bet){
    $('#bet_input').attr("disabled", true);
    $('#cashout_input').attr("disabled", true);

    $('#bet_cashout_button').text("Betting...");
    $('#bust_box').html("<span>"+parseFloat((currentAt-0.01)<1?0:(currentAt-0.01)).formatMoney(2,'.',',')+"</span>x");

    var win;
    getHash(function(){
        var odds = 0.99/stopAt;
        var rangeWin = Math.floor(Math.pow(2,32)*(odds));
        $.ajax({
            type: "POST",
            contentType: "application/json",
            url: "https://api.moneypot.com/v1/bets/custom?access_token="+user.token,
            data: JSON.stringify({
                client_seed: parseInt(user.clientSeed),
                hash: String(user.hash),
                wager: parseFloat(bet*100),
                "payouts": [
                    {from: 0, to: rangeWin, value: ((bet*stopAt)*100)},
                    {from: rangeWin, to: Math.pow(2,32), value: 0}
                ]
            }),
            dataType: "json",
            error: function(xhr, status, error) {
                console.error("BET ERROR:", xhr.responseText);
                return;
            }
        }).done(function(data){
            if(data.outcome >= rangeWin){ // loss
                var lostAt = Math.random() * ((stopAt-0.01) - 0 + 1) + 0;
                var losingBetInterval = setInterval(function(){
                    if(currentAt<lostAt){ // betting
                        betting = true;
                        $('#bust_box').html("<span>"+parseFloat((currentAt-0.01)<1?0:(currentAt-0.01)).formatMoney(2,'.',',')+"</span>x");
                        currentAt += 0.01
                        if(currentAt < 1 && currentAt > 0) currentAt == 1;
                    }else{ // finished betting lost
                        clearInterval(losingBetInterval);
                        user.balance -= parseFloat(bet);
                        $('#balance').text((user.balance).formatMoney(2,'.',','));
                        $.getJSON("https://api.moneypot.com/v1/auth?access_token="+user.token, function(json){
                            user.balance = json.user.balance/100;
                            $('#balance').text((user.balance).formatMoney(2,'.',','));  
                        });
                        console.log("Crashed.");
                        betting = false;
                        $('#bet_input').attr("disabled", false);
                        $('#cashout_input').attr("disabled", false);
                        $('#bust_box').html("Crashed @ <span>"+parseFloat((lostAt<1&&lostAt>=0?0:lostAt)).formatMoney(2,'.',',')+"</span>x");
                        $('#bet_cashout_button').text("Bet");

                        var table = document.getElementById("history_log");
                    
                        var row = table.insertRow(0);
                        row.id = "mybet_"+data.id;
                        row.className = "history_log_item";
                        
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        var cell3 = row.insertCell(2);
                        var cell4 = row.insertCell(3);
                        
                        var win = parseFloat(data.profit) >= 0;
                        
                        cell1.innerHTML = parseFloat(lostAt<1&&lostAt>0?0:lostAt).formatMoney(2,'.',',');
                        cell1.className = (win?"win":"lost");
                        cell2.innerHTML = $('#bet_input').val();
                        cell3.innerHTML = (data.profit/100).formatMoney(2, '.', ',');
                        cell4.innerHTML = "<a href=\"https://moneypot.com/bets/"+data.id+"\" target=\"blank\">"+user.hash+"</a>";
                        cell4.className = "game_hash";

                        user.hash = null;

                        $('.history_log_item').each(function(index){
                            if(index>15) $(this).remove();
                        });

                        setTimeout(function(){
                            if(AutoRunning){
                                placeBet( parseFloat($('#auto_cashout_input').val()), parseFloat(bet)*parseFloat($('#auto_increase_on_loss_input').val()) );
                            }
                        }, 1000);
                    }
                }, 100);
            }else{ // win
                var winningBetInterval = setInterval(function(){
                    if(currentAt<stopAt){ // betting
                        betting = true;
                        $('#bust_box').html("<span>"+parseFloat((currentAt-0.01)<1?0:(currentAt-0.01)).formatMoney(2,'.',',')+"</span>x");
                        currentAt += 0.01
                        if(currentAt < 1 && currentAt > 0) currentAt == 1;
                    }else{ // finished betting win
                        clearInterval(winningBetInterval);
                        console.log("Cashed out");
                        cashedOut = false;
                        betting = false;
                        user.balance += (parseFloat(bet)*currentAt)-parseFloat(bet);
                        $('#balance').text((user.balance).formatMoney(2,'.',','));
                        $.getJSON("https://api.moneypot.com/v1/auth?access_token="+user.token, function(json){
                            user.balance = json.user.balance/100;
                            $('#balance').text((user.balance).formatMoney(2,'.',','));  
                        });
                        $('#bet_input').attr("disabled", false);
                        $('#cashout_input').attr("disabled", false);
                        $('#bust_box').html("@ <span>"+parseFloat(stopAt).formatMoney(2,'.',',')+"</span>x");
                        $('#bet_cashout_button').text("Bet");
                        var table = document.getElementById("history_log");
                
                        var row = table.insertRow(0);
                        row.id = "mybet_"+data.id;
                        row.className = "history_log_item";
                        
                        var cell1 = row.insertCell(0);
                        var cell2 = row.insertCell(1);
                        var cell3 = row.insertCell(2);
                        var cell4 = row.insertCell(3);
                        
                        var win = parseFloat(data.profit) >= 0;
                        
                        cell1.innerHTML = parseFloat(stopAt).formatMoney(2,'.',',');
                        cell1.className = (win?"win":"lost");
                        cell2.innerHTML = $('#bet_input').val();
                        cell3.innerHTML = (data.profit/100).formatMoney(2, '.', ',');
                        cell4.innerHTML = "<a href=\"https://moneypot.com/bets/"+data.id+"\" target=\"blank\">"+user.hash+"</a>";
                        cell4.className = "game_hash";

                        user.hash = null;

                        $('.history_log_item').each(function(index){
                            if(index>15) $(this).remove();
                        });

                        setTimeout(function(){
                            if(AutoRunning){
                                placeBet(parseFloat($('#auto_cashout_input').val()), parseFloat($('#auto_bet_input').val()));
                            }
                        }, 1000);
                    }
                }, 100);
            }
        });
    });
}

function correctCaptcha(response) {
    $.ajax({
        type: "POST",
        contentType: "application/json",
        url: "https://api.moneypot.com/v1/claim-faucet?access_token="+user.token,
        data: JSON.stringify({
            "response": response
        }),
        dataType: "json"
    }).done(function(data) {
        console.log((data.amount/100)+" has been added to your balance!");
        $.get( "https://api.moneypot.com/v1/auth?access_token="+user.token, function( data ) {
            if(typeof data.user.uname !== "undefined"){
                user_balance = (data.user.balance/100);
                $('#balance').text((user.balance).formatMoney(2,'.',','));
            }
        });
        $("#faucetClaimCaptcha").css("top", "-90px");
        grecaptcha.reset();
        showingrecaptcha = false;
    }).fail(function(data) {
        var error = data.error;
        if(error == "FAUCET_ALREADY_CLAIMED"){
            console.error("Faucet already claimed");
            grecaptcha.reset();
        }else if(error == "INVALID_INPUT_RESPONSE"){
            console.error("Google has rejected the response. Try to refresh and do again.");
            grecaptcha.reset();
        }
        $("#faucetClaimCaptcha").css("top", "-90px");
        showingrecaptcha = false;
    });
};

function getRandCseed(){
    var array = new Uint32Array(1);
    return window.crypto.getRandomValues(array)[0];
}

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[#|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.hash)||[,""])[1].replace(/\+/g, '%20'))||null
}

Number.prototype.formatMoney = function(c, d, t){
    var n = this, 
        c = isNaN(c = Math.abs(c)) ? 2 : c, 
        d = d == undefined ? "." : d, 
        t = t == undefined ? "," : t, 
        s = n < 0 ? "-" : "", 
        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
        j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};
