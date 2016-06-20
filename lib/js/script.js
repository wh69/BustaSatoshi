/** Credits - Do not edit/remove this comment (Read http://domain.name/LICENSE)
 * @desc domain.name core source file
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

$(function(){
    if(getURLParameter('access_token')!="" && getURLParameter('access_token')!=null){
        login(getURLParameter('access_token'));
    }

    $('#bet_cashout_button').click(function(){
        placeBet($('#cashout_input').val(), $('#bet_input').val(), 1, $('#bet_input').val());
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
                return;
            }
        });
    }else{
        if(callback) callback();
    }
}

var cashedOut = false;
function placeBet(stopAt, bet, currentAt, stake){
    $('#bet_input').attr("disabled", true);
    $('#cashout_input').attr("disabled", true);

    $('#bet_cashout_button').text("Cashout");
    $('#bust_box').html("<span>"+currentAt+"</span>x");
    $('#bet_cashout_button').click(function(){cashedOut = true;});

    getHash(function(){

        var odds = 0.99/currentAt;
        var rangeWin = Math.floor(Math.pow(2,32)*(odds));
        $.ajax({
            type: "POST",
            contentType: "application/json",
            url: "https://api.moneypot.com/v1/bets/custom?access_token="+user.token,
            data: JSON.stringify({
                client_seed: parseInt(user.clientSeed),
                hash: String(user.hash),
                wager: bet,
                "payouts": [
                    {from: 0, to: rangeWin, value: ((bet*currentAt)*100)},
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
                $('#bet_cashout_button').text("Bet");
                $('#bet_cashout_button').click(function(){placeBet($('#cashout_input').val(), $('#bet_input').val(), 1, $('#bet_input').val());});
                var table = document.getElementById("history_log");
            
                var row = table.insertRow(0);
                row.id = "mybet_"+data.id;
                row.className = "history_log_item";
                
                var cell1 = row.insertCell(0);
                var cell2 = row.insertCell(1);
                var cell3 = row.insertCell(2);
                var cell4 = row.insertCell(3);
                
                var win = parseFloat(data.profit) >= 0;
                
                cell1.innerHTML = data.currentAt;
                cell1.className = (win?"win":"lost");
                cell2.innerHTML = $('#bet_input').val();
                cell3.innerHTML = (data.profit/100).formatMoney(2, '.', ',');
                cell4.innerHTML = "<a href=\"https://www.moneypot.com/bets/"+data.id+"\" target=\"blank\">"+user.hash+"</a>";
                cell4.className = "game_hash";

                user.hash = null;

                $('.history_log_item').each(function(index){
                    if(index>15) $(this).remove();
                });
            }else{ // win
                if(stopAt <= currentAt){
                    user.hash = data.next_hash;
                    if(!cashedOut)
                        setTimeout(function(){placeBet(stopAt, stake, currentAt+0.01, stake+((bet*(currentAt+0.01))-bet));}, 1);
                    else{
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
                        
                        cell1.innerHTML = data.currentAt;
                        cell1.className = (win?"win":"lost");
                        cell2.innerHTML = $('#bet_input').val();
                        cell3.innerHTML = (data.profit/100).formatMoney(2, '.', ',');
                        cell4.innerHTML = "<a href=\"https://www.moneypot.com/bets/"+data.id+"\" target=\"blank\">"+user.hash+"</a>";
                        cell4.className = "game_hash";

                        user.hash = null;

                        $('.history_log_item').each(function(index){
                            if(index>15) $(this).remove();
                        });
                    }
                }else{
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
                    
                    cell1.innerHTML = data.currentAt;
                    cell1.className = (win?"win":"lost");
                    cell2.innerHTML = $('#bet_input').val();
                    cell3.innerHTML = (data.profit/100).formatMoney(2, '.', ',');
                    cell4.innerHTML = "<a href=\"https://www.moneypot.com/bets/"+data.id+"\" target=\"blank\">"+user.hash+"</a>";
                    cell4.className = "game_hash";

                    user.hash = null;

                    $('.history_log_item').each(function(index){
                        if(index>15) $(this).remove();
                    });
                }
            }
        });
    });
}


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