/* ''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''' *\
 *        .NN.        _____ _____ _____  _    _                 This file is part of CGRU
 *        hMMh       / ____/ ____|  __ \| |  | |       - The Free And Open Source CG Tools Pack.
 *       sMMMMs     | |   | |  __| |__) | |  | |  CGRU is licensed under the terms of LGPLv3, see files
 * <yMMMMMMMMMMMMMMy> |   | | |_ |  _  /| |  | |    COPYING and COPYING.lesser inside of this folder.
 *   `+mMMMMMMMMNo` | |___| |__| | | \ \| |__| |          Project-Homepage: http://cgru.info
 *     :MMMMMMMM:    \_____\_____|_|  \_\\____/        Sourcecode: https://github.com/CGRU/cgru
 *     dMMMdmMMMd     A   F   A   N   A   S   Y
 *    -Mmo.  -omM:                                           Copyright © by The CGRU team
 *    '          '
\* ....................................................................................................... */

/*
	news.js - TODO: description
*/

"use strict";

var nw_recent_file = 'recent.json';
var nw_initialized = false;
var nw_recents = {};
var nw_filter_project = null;
var nw_disabled = false;
var nw_ignore_own = false;

function nw_Init()
{
	// Recent:
	if (localStorage.recent_opened == null)
		localStorage.recent_opened = 'false';
	if (localStorage.recent_opened == 'true')
		nw_RecentOpen(false);

	// News are not available for guests:
	if (g_auth_user == null)
		return;

	// News:
	nw_ShowCount();

	$('sidepanel_news').style.display = 'block';
	nw_initialized = true;

	if (localStorage.news_disabled == null)
		localStorage.news_disabled = 'false';
	if (localStorage.news_ignore_own == null)
		localStorage.news_ignore_own = 'false';

	if (localStorage.news_disabled == 'true')
		nw_disabled = true;
	if (localStorage.news_ignore_own == 'true')
		nw_ignore_own = true;

	nw_Finish();
	nw_UpdateChannels();
	nw_DisableNewsToggle(false);
	nw_IgnoreOwnToggle(false);
}

function nw_InitConfigured()
{
	if (localStorage.news_opened == 'true')
		nw_NewsOpen(false);
	else
		nw_NewsClose();

	if (RULES.news.refresh == null)
		return;
	if (RULES.news.refresh < 1)
		return;
	setInterval(nw_NewsLoad, RULES.news.refresh * 1000);
}

function nw_GetUserFileName()
{
	return ad_GetUserFileName(g_auth_user.id, 'news');
}

/* ---------------- [ Toggle functions ] ----------------------------------------------------------------- */

function nw_DisableNewsToggle(i_toggle)
{
	if (i_toggle === true)
	{
		if (nw_disabled)
		{
			nw_disabled = false;
			localStorage.news_disabled = 'false';
		}
		else
		{
			nw_disabled = true;
			localStorage.news_disabled = 'true';
		}
	}

	if (nw_disabled)
		$('sidepanel_news').classList.add('news_disabled');
	else
		$('sidepanel_news').classList.remove('news_disabled');
}

function nw_IgnoreOwnToggle(i_toggle)
{
	if (i_toggle === true)
	{
		if (nw_ignore_own)
		{
			nw_ignore_own = false;
			localStorage.news_ignore_own = 'false';
		}
		else
		{
			nw_ignore_own = true;
			localStorage.news_ignore_own = 'true';
		}
	}

	if (nw_ignore_own)
		$('sidepanel_news').classList.add('news_ignore_own');
	else
		$('sidepanel_news').classList.remove('news_ignore_own');
}

function nw_SortOrderToggle()
{
	if (localStorage.news_sort_order == 'ASC')
		localStorage.news_sort_order = 'DESC';
	else
		localStorage.news_sort_order = 'ASC';

	nw_NewsLoad();
}


function nw_UpdateChannels()
{
	var elChannels = $('channels');
	elChannels.innerHTML = '';
	elChannels.m_elChan = [];
	for (var i = 0; i < g_auth_user.channels.length; i++)
	{
		var path = g_auth_user.channels[i].id;

		var el = document.createElement('div');
		$('channels').appendChild(el);
		el.classList.add('channel');
		el.title = 'Subscribed by ' + g_auth_user.channels[i].user + ' at\n' +
			c_DT_StrFromSec(g_auth_user.channels[i].time);
		el.m_path = path;

		var elBtn = document.createElement('div');
		el.appendChild(elBtn);
		elBtn.classList.add('button');
		elBtn.classList.add('delete');
		elBtn.m_path = path;
		elBtn.ondblclick = function(e) { nw_Unsubscribe(e.currentTarget.m_path); };
		elBtn.title = 'Double click to remove channel';

		var elLink = document.createElement('a');
		el.appendChild(elLink);
		elLink.href = '#' + path;
		elLink.textContent = path;

		elChannels.m_elChan.push(el);
	}
}

function nw_Process()
{
	if (localStorage.recent_opened == 'true')
		nw_RecentLoad();

	if (false == nw_initialized)
		return;

	nw_HighlightChannels();

	if (c_IsUserSubsribedOnPath())
	{
		$('subscribe_btn').style.display = 'none';
	}
	else
		nw_Finish(false);
}

function nw_Finish(i_finish_recent)
{
	if (i_finish_recent !== false)
		$('recent').innerHTML = '';

	if (false == nw_initialized)
		return;

	$('subscribe_btn').style.display = 'block';
}

/* ---------------- [ Subscribe functions ] -------------------------------------------------------------- */

function nw_Subscribe(i_path)
{
	if (i_path == null)
		i_path = g_CurPath();

	var channel = {};
	channel.id = i_path;
	channel.time = c_DT_CurSeconds();
	channel.user = g_auth_user.id;

	var new_channels = [channel];

	if (g_auth_user.channels == null)
		g_auth_user.channels = [];

	for (var i = 0; i < g_auth_user.channels.length; i++)
	{
		var path = g_auth_user.channels[i].id;
		if (path == i_path)
		{
			c_Error('Already subscribed on: ' + path);
			return;
		}
		if (path.indexOf(i_path) != -1)
		{
			c_Info('Already subscribed on sub-folder: ' + path);
			return;
		}
		/*
		if( i_path.indexOf( path) != -1 )
		{
			c_Info('Unsubscribing sub-path: ' + path);
			continue;
		}
		*/
		new_channels.push(g_auth_user.channels[i]);
	}

	var obj = {};
	obj.object = {'channels': new_channels};
	obj.add = true;
	obj.file = ad_GetUserFileName();

	n_Request({"send": {"editobj": obj}, "func": nw_SubscribeFinished, 'path': i_path});
}

function nw_SubscribeFinished(i_data, i_args)
{
	if ((i_data == null) || (i_data.error))
	{
		c_Error(i_data.error);
		return;
	}

	g_auth_user.channels = i_data.object.channels;
	nw_UpdateChannels();
	nw_Process();

	c_Info('Subscribed at ' + i_args.path);
}

function nw_Unsubscribe(i_path)
{
	if (i_path == null)
		i_path = g_CurPath();


	var obj = {};

	obj.objects = [{"id": i_path}];
	obj.delarray = 'channels';
	obj.id = g_auth_user.id;
	obj.file = ad_GetUserFileName();

	n_Request({"send": {"editobj": obj}, "func": nw_UnsubscribeFinished, 'path': i_path});
}

function nw_UnsubscribeFinished(i_data, i_args)
{
	if ((i_data == null) || (i_data.error))
	{
		c_Error(i_data.error);
		return;
	}

	g_auth_user.channels = i_data.object.channels;
	nw_UpdateChannels();
	nw_Process();

	c_Info('Unsubscribed from ' + i_args.path);
}


function nw_NewsOnClick()
{
	if ($('sidepanel').classList.contains('opened'))
	{
		if ($('sidepanel_news').classList.contains('opened'))
			nw_NewsClose();
		else
			nw_NewsOpen();
	}
	else
	{
		u_SidePanelOpen();
		nw_NewsOpen();
	}
}

function nw_NewsClose()
{
	$('sidepanel_news').classList.remove('opened');
	$('news').innerHTML = '';
	localStorage.news_opened = false;
}

function nw_NewsOpen(i_refresh)
{
	$('sidepanel_news').classList.add('opened');
	localStorage.news_opened = true;
	nw_NewsLoad(i_refresh);
}

/* ---------------- [ News creation functions ]
 * --------------------------------------------------------------- */

function nw_MakeNewsDialog()
{
	if (g_auth_user == null)
		return;
	new cgru_Dialog({
		"handle": 'nw_MakeNewsDialogApply',
		"name": 'news',
		"title": 'Create News',
		"info": 'Enter News Title'
	});
}

function nw_MakeNewsDialogApply(i_title)
{
	nw_MakeNews({"title": i_title});
}

function nw_MakeNews(i_news, i_args)
{
	var request = nw_CreateNews(i_news);
	nw_SendNews([request], i_args);
}

function nw_FilterStatus(i_status)
{
	var st = {};
	var skip_keys = ['body'];

	for (let key in i_status)
		if (skip_keys.indexOf(key) == -1)
			st[key] = i_status[key];

	return st;
}

function nw_StatusesChanged(i_statuses)
{
	var news_requests = [];
	var bookmarks = [];

	for (let i = 0; i < i_statuses.length; i++)
	{
		let st = nw_FilterStatus(i_statuses[i].obj);

		let request = nw_CreateNews(
			{'title':'status','path':i_statuses[i].path,'status':st});
		if (request)
			news_requests.push(request);

		let bm = {};
		bm.status = st;
		bm.path = i_statuses[i].path;
		bookmarks.push(bm);
	}

	var obj = {};
	obj.send = {};
	obj.send.makenews = {};
	obj.send.makenews.news_requests = news_requests;
	obj.send.makenews.bookmarks = bookmarks;
	obj.func = nw_MakeNewsFinished;
	obj.args = {'func': bm_StatusesChanged};
	obj.info = 'news statuses';

	n_Request(obj);
}

function nw_CreateNews(i_news)
{
	if (i_news == null)
	{
		c_Error('Can`t create news from "null".');
		return;
	}

	if (nw_disabled)
		return;

	var news = i_news;

	if (news.user_id == null)
	{
		if (g_auth_user)
		{
			news.user = g_auth_user.id;
		}
		else
		{
			c_Error('Can`t make news with no user.');
			return;
		}
	}

	if (news.path == null)
		news.path = g_CurPath();

	news.time = c_DT_CurSeconds();
	news.id = news.user + '_' + news.time + '_' + news.path;

	// If news status is not set, we get the current:
	if (news.status == null)
		news.status = RULES.status;

	var email_subject = c_GetUserTitle(news.user) + ' - ' + news.title;
	var email_body = '<a href="';
	email_body += document.location.protocol + '//' + document.location.host + document.location.pathname;
	if (news.link)
		email_body += news.link;
	else
		email_body += '#' + news.path;
	email_body += '">' + news.path + '</a>';

	var request = {};
	request.news = news;
	request.email_from_title = c_EmailFromTitle();
	request.email_subject = email_subject;
	request.email_body = email_body;
	request.root = RULES.root;
	request.rufolder = RULES.rufolder;
	request.limit = RULES.news.limit;
	request.recent_max = RULES.news.recent;
	request.recent_file = nw_recent_file;
	if (nw_ignore_own)
		request.ignore_own = true;

	return request;
}

function nw_SendNews(i_requests, i_args)
{
	if (i_requests == null)
	{
		c_Error('Can`t send news from "null" requests.');
		return;
	}
	if (i_requests.length == 0)
	{
		c_Error('Can`t send news from zero size request.');
		return;
	}
	for (var i = 0; i < i_requests.length; i++)
	{
		if (i_requests[i] == null)
		{
			c_Error('Can`t send news from "null" request[' + i + '].');
			return;
		}
	}

	n_Request({
		'send': {'makenews': {'news_requests': i_requests}},
		'info': 'news make',
		'func': nw_MakeNewsFinished,
		'args': i_args
	});
}

function nw_MakeNewsFinished(i_data, i_args)
{
	if (i_data.error)
	{
		c_Error(i_data.error);
		return;
	}

	if (i_args.args && (i_args.args.load === false))
		return;

	if (p_PLAYER != true)
	{
		nw_NewsLoad();
		nw_RecentLoad({"file_check": false});
	}

	if (i_data.users.length == 0)
	{
		c_Log('No subscribed users found.');
		return;
	}

	var info = 'Subscribed users:';
	for (var i = 0; i < i_data.users.length; i++)
		info += ' ' + i_data.users[i];
	c_Log(info);

	if (i_args.args && i_args.args.func)
		i_args.args.func(i_args.args);
}


function nw_ShowCount(i_hidden_count)
{
	if (g_auth_user == null)
		return;

	if (g_auth_user.news && g_auth_user.news.length)
	{
		var count = g_auth_user.news.length;
		if (i_hidden_count)
			count += '/' + (g_auth_user.news.length - i_hidden_count);
		$('news_label').textContent = 'News - ' + count;
	}
	else
	{
		$('news_label').textContent = 'News';
	}
}

function nw_NewsLoad(i_refresh)
{
	if (g_auth_user == null)
		return;

	if (i_refresh === false)
	{
		nw_NewsShow(false);
		return;
	}

	n_GetFile({
		'path': nw_GetUserFileName(),
		'func': nw_NewsReceived,
		'info': 'news',
		'cache_time': -1,
		'parse': true,
		'local': false
	});
}

function nw_NewsReceived(i_data)
{
	if (i_data == null)
		return;

	if (i_data.error)
	{
		c_Log(i_data.error);
		// If there is no news file, error will be returned.
		// No file, is not an error in this case.
		// This just means that there is no news.
	}

	var news = [];
	if (i_data.news)
		news = i_data.news;

	g_auth_user.news = [];
	for (var i = 0; i < news.length; i++)
		if (news[i])
			g_auth_user.news.push(news[i]);

	nw_NewsShow();
}

function nw_NewsShow(i_update_folders)
{
	$('news').innerHTML = '';
	$('news').m_elArray = [];

	g_auth_user.news.sort(function(a, b) {
		var attr = 'time';
		if (a[attr] > b[attr])
			return -1;
		if (a[attr] < b[attr])
			return 1;
		return 0;
	});

	if (localStorage.news_sort_order == 'ASC')
		g_auth_user.news.reverse();

	let projects = [];

	for (let i = 0; i < g_auth_user.news.length; i++)
	{
		let news = g_auth_user.news[i];

		let el = document.createElement('div');
		$('news').appendChild(el);
		$('news').m_elArray.push(el);
		el.classList.add('news');
		el.m_news = news;
		el.title = c_DT_StrFromSec(news.time);

		// Highlight news if artists is assigned,
		// but only if artists has no subscribed channels
		// ( if artist has no channels all news are "assigned"
		if (g_auth_user.channels && g_auth_user.channels.length)
			if (news.status && news.status.artists && (news.status.artists.indexOf(g_auth_user.id) != -1))
				el.classList.add('assigned');

		let avatar = c_GetAvatar(news.user, news.guest);
		if (avatar)
		{
			let elAvatar = document.createElement('img');
			el.appendChild(elAvatar);
			elAvatar.classList.add('avatar');
			elAvatar.src = avatar;
			elAvatar.title =
				c_GetUserTitle(news.user, news.guest) + '\nDouble click to delete all news from this user.';
			elAvatar.m_news = news;
			elAvatar.ondblclick = function(e) { nw_DeleteNewsUser(e.currentTarget.m_news); };
		}


		let elBtn = document.createElement('div');
		el.appendChild(elBtn);
		elBtn.classList.add('button');
		elBtn.classList.add('delete');
		elBtn.m_id = news.id;
		elBtn.ondblclick = function(e) { nw_DeleteNews([e.currentTarget.m_id]); };
		elBtn.title = 'Double click to remove link';

		let elLabel = document.createElement('div');
		el.appendChild(elLabel);
		elLabel.classList.add('news_label');
		elLabel.innerHTML = c_GetUserTitle(news.user, news.guest) + ': ' + news.title;

		let elLinkDiv = document.createElement('div');
		el.appendChild(elLinkDiv);
		elLinkDiv.classList.add('link');

		let elLink = document.createElement('a');
		elLinkDiv.appendChild(elLink);
		if (news.link)
			elLink.href = news.link;
		else
			elLink.href = '#' + news.path;
		elLink.textContent = news.path;

		// Display news status:
		st_SetElStatus(el, news.status, c_IsUserSubsribedOnPath(news.path));

		let prj = news.path.split('/')[1];
		if (projects.indexOf(prj) == -1)
			projects.push(prj);
	}

	// News projects:
	$('news_projects').innerHTML = '';
	for (let i = 0; i < projects.length; i++)
	{
		let el = document.createElement('div');
		$('news_projects').appendChild(el);
		el.classList.add('button');
		el.classList.add('nw_fb');
		el.textContent = projects[i];
		el.onclick = function(e) { nw_FilterBtn(e.currentTarget, e.currentTarget.textContent, true); };

		el.m_filter = projects[i];
		el.m_project = true;

		if (nw_filter_project == projects[i])
			el.classList.add('pushed');
	}

	// Update folders statuses:
	if (i_update_folders !== false)
	{
		for (let i = 0; i < g_auth_user.news.length; i++)
		{
			let news = g_auth_user.news[i];
			if (news.status == null) continue;
			if (news.time == null) continue;

			// Update status only when news title is status.
			// There is no need to update status on body, comments change.
			if (news.title != 'status') continue;

			let el = g_elFolders[news.path];
			if (el == null) continue;

			let fstat = el.m_fobject.status;
			if (fstat == null) continue;

			// Update only if news time > folder status time
			if (fstat.ctime && (fstat.ctime >= news.time)) continue;
			if (fstat.mtime && (fstat.mtime >= news.time)) continue;

			// Update folder status:
			g_FolderSetStatus(news.status, el);

			// Update current location status:
			if (news.path == g_CurPath())
			{
				RULES.status = news.status;
				st_Update(news.status);
			}

			// Remove walk cache:
			if (n_walks[news.path])
				n_walks[news.path] = null;
		}
	}

	nw_HighlightCurrent();
	nw_Filter();
}

function nw_NavigatePost()
{
	nw_Process();
	nw_HighlightCurrent();
}

function nw_HighlightCurrent()
{
	var path = g_CurPath();
	var elNews = $('news').m_elArray;
	if (elNews == null)
		return;

	for (var i = 0; i < elNews.length; i++)
		if (path == elNews[i].m_news.path)
			elNews[i].classList.add('cur_path');
		else
			elNews[i].classList.remove('cur_path');

	nw_HighlightChannels();
}

function nw_HighlightChannels()
{
	if (g_CurPath() == null)
		return;

	var elChannels = $('channels').m_elChan;
	for (var i = 0; i < elChannels.length; i++)
	{
		if (g_CurPath().indexOf(elChannels[i].m_path) == 0)
			elChannels[i].classList.add('current');
		else
			elChannels[i].classList.remove('current');
	}
}

function nw_FilterBtn(i_btn, i_filter, i_project)
{
	i_btn.m_filter = i_filter;
	i_btn.m_project = i_project;

	// Get all news filter buttons and remove push:
	var btns = document.getElementsByClassName('nw_fb');
	for (var i = 0; i < btns.length; i++)
		btns[i].classList.remove('pushed');

	// Add push on clicked button except 'All':
	if (i_filter == '_all_')
		nw_filter_project = null;
	else
		i_btn.classList.add('pushed');

	nw_Filter();
}

function nw_Filter()
{
	var filter = null;
	var project = null;

	// Get all news filter buttons and remove push:
	var btns = document.getElementsByClassName('nw_fb');
	for (var i = 0; i < btns.length; i++)
		if (btns[i].classList.contains('pushed'))
		{
			filter = btns[i].m_filter;
			project = btns[i].m_project;
		}

	var assigned = (filter == '_ia_');
	var by_me = (filter == '_me_');

	var elNews = $('news').m_elArray;
	var hidden_count = 0;
	for (var i = 0; i < elNews.length; i++)
	{
		if ((filter === null) || (project && (elNews[i].m_news.path.indexOf(filter) == 1)) ||
			(elNews[i].m_news.title == filter) || (by_me && (g_auth_user.id == elNews[i].m_news.user)) ||
			(assigned && (elNews[i].classList.contains('assigned'))))
		{
			elNews[i].style.display = 'block';
		}
		else
		{
			elNews[i].style.display = 'none';
			hidden_count++;
		}
	}

	if (project)
		nw_filter_project = filter;

	nw_ShowCount(hidden_count);
}

function nw_DeleteFiltered(i_visible)
{
	var elNews = $('news').m_elArray;
	var display = 'none';
	if (i_visible)
		display = 'block';

	var ids = [];
	for (var i = 0; i < elNews.length; i++)
		if (elNews[i].style.display == display)
			ids.push(elNews[i].m_news.id);

	if (i_visible)
		nw_FilterBtn($('news_filter_show_all'), '_all_');

	nw_DeleteNews(ids);
}

function nw_DeleteNewsUser(i_news)
{
	var elNews = $('news').m_elArray;
	var ids = [];
	for (var i = 0; i < elNews.length; i++)
		if (elNews[i].m_news.user == i_news.user)
			ids.push(elNews[i].m_news.id);

	nw_DeleteNews(ids);
}

/* ---------------- [ Delete functions ] ----------------------------------------------------------------- */

function nw_DeleteNews(i_ids)
{
	// Delete all new if ids is not specified:
	if (i_ids == null)
	{
		i_ids = [];
		var elNews = $('news').m_elArray;
		// Make an array with all ids:
		for (var i = 0; i < elNews.length; i++)
			i_ids.push(elNews[i].m_news.id);
	}

	if (i_ids.length == 0)
	{
		c_Error('No news to delete.');
		nw_NewsLoad();
		return;
	}

	var obj = {};
	obj.objects = [];
	for (var i = 0; i < i_ids.length; i++)
		obj.objects.push({"id": i_ids[i]});
	obj.delarray = 'news';

	obj.file = nw_GetUserFileName();
	n_Request({"send": {"editobj": obj}, "func": nw_DeleteNewsFinished});
}

function nw_DeleteNewsFinished(i_data)
{
	if ((i_data == null) || (i_data.error))
	{
		c_Error(i_data.error);
		return;
	}

	c_Info('News deleted');
	nw_NewsLoad();
}

/* ---------------- [ Recent functions ] ----------------------------------------------------------------- */

function nw_RecentOnClick()
{
	if ($('sidepanel').classList.contains('opened'))
	{
		if ($('sidepanel_recent').classList.contains('opened'))
			nw_RecentClose();
		else
			nw_RecentOpen();
	}
	else
	{
		u_SidePanelOpen();
		nw_RecentOpen();
	}
}

function nw_RecentClose()
{
	$('sidepanel_recent').classList.remove('opened');
	$('recent').innerHTML = '';
	localStorage.recent_opened = 'false';
}

function nw_RecentOpen(i_noload)
{
	$('sidepanel_recent').classList.add('opened');
	localStorage.recent_opened = 'true';
	if (i_noload !== false)
		nw_RecentLoad();
}

function nw_RecentLoad(i_args)
{
	if (i_args == null)
		i_args = {};

	if ((i_args.file_check !== false) && (false == c_RuFileExists(nw_recent_file)))
		return;

	$('recent').textContent = 'Loading...';

	var cache = RULES.cache_time;
	if (i_args.cache === false)
		cache = 0;

	n_GetFile({
		"path": c_GetRuFilePath(nw_recent_file),
		"func": nw_RecentReceived,
		"cache_time": cache,
		"info": 'recent',
		"parse": true,
		"local": true
	});
}

function nw_RecentRefresh()
{
	nw_RecentLoad({"cache": false});
}

function nw_RecentReceived(i_data, i_args)
{
	$('recent').innerHTML = '';
	if (i_data == null)
		return;
	if (i_data.error)
		return;

	for (var i = 0; i < i_data.length; i++)
	{
		var news = i_data[i];

		var el = document.createElement('div');
		$('recent').appendChild(el);
		el.classList.add('recent');

		var avatar = c_GetAvatar(news.user, news.guest);
		if (avatar)
		{
			var elAvatar = document.createElement('img');
			el.appendChild(elAvatar);
			elAvatar.classList.add('avatar');
			elAvatar.src = avatar;
		}

		var elUser = document.createElement('div');
		el.appendChild(elUser);
		elUser.classList.add('user');
		elUser.textContent = c_GetUserTitle(news.user, news.guest);

		var elTitle = document.createElement('div');
		el.appendChild(elTitle);
		elTitle.classList.add('title');
		elTitle.innerHTML = news.title;

		var elLinkDiv = document.createElement('div');
		el.appendChild(elLinkDiv);
		elLinkDiv.classList.add('link');

		var elLink = document.createElement('a');
		elLinkDiv.appendChild(elLink);
		if (news.link)
			elLink.href = news.link;
		else
			elLink.href = '#' + news.path;
		elLink.textContent = news.path;

		// Display status:
		if (news.status)
		{
			let elStatus = document.createElement('div');
			el.appendChild(elStatus);
			elStatus.classList.add('status');

			// Flags:
			if (news.status.flags && news.status.flags.length)
			{
				let elFlags = document.createElement('div');
				elStatus.appendChild(elFlags);
				elFlags.classList.add('flags');
				st_SetElFlags(news.status, elFlags);
			}

			let elTasks = document.createElement('div');
			el.appendChild(elTasks);
			elTasks.classList.add('tasks');
			task_DrawBadges(news.status, elTasks);

			// Progress:
			if (news.status.progress)
			{
				let elBar = document.createElement('div');
				el.appendChild(elBar);
				elBar.classList.add('bar');
				st_SetElProgress(news.status, elBar);
			}
		}

		var elTime = document.createElement('div');
		el.appendChild(elTime);
		elTime.classList.add('time');
		elTime.innerHTML = c_DT_StrFromSec(news.time, /*no seconds = */ true);
	}
}
