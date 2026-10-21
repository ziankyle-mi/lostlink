Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

$voices = $synth.GetInstalledVoices()
Write-Host "Found voices:"
foreach ($v in $voices) {
    Write-Host " - $($v.VoiceInfo.Name) ($($v.VoiceInfo.Gender), $($v.VoiceInfo.Culture))"
}
