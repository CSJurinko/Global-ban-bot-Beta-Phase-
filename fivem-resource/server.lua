local apiUrl = GetConvar('globalban_api_url', '')
local apiKey = GetConvar('globalban_api_key', '')

local function getDiscordId(playerId)
    for _, identifier in ipairs(GetPlayerIdentifiers(playerId)) do
        local discordId = identifier:match('^discord:(%d+)$')
        if discordId then
            return discordId
        end
    end
    return nil
end

AddEventHandler('playerConnecting', function(_, _, deferrals)
    local playerId = source
    deferrals.defer()
    Wait(0)

    if apiUrl == '' or apiKey == '' then
        print('[globalban] API URL or API key is not configured; allowing connection.')
        deferrals.done()
        return
    end

    local discordId = getDiscordId(playerId)
    if not discordId then
        deferrals.done()
        return
    end

    deferrals.update('Checking global ban status...')
    PerformHttpRequest(apiUrl .. '/v1/bans/check', function(statusCode, responseBody)
        if statusCode ~= 200 then
            print(('[globalban] Ban check failed with HTTP %s; allowing connection.'):format(statusCode))
            deferrals.done()
            return
        end

        local ok, result = pcall(json.decode, responseBody or '{}')
        if not ok or type(result) ~= 'table' then
            print('[globalban] Invalid API response; allowing connection.')
            deferrals.done()
            return
        end

        if result.banned then
            deferrals.done(('Global ban: %s'):format(result.reason or 'No reason provided'))
        else
            deferrals.done()
        end
    end, 'POST', json.encode({ discordId = discordId }), {
        ['Content-Type'] = 'application/json',
        ['Authorization'] = 'Bearer ' .. apiKey
    })
end)