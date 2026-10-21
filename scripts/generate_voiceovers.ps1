Add-Type -AssemblyName System.Speech

$narrations = @(
    @{
        File = "voice_scene1_hook.wav"
        Text = "Lost your student ID, laptop, or valuables on campus? Finding what you lost shouldn't be complicated."
    },
    @{
        File = "voice_scene2_reveal.wav"
        Text = "Introducing LostLink. The unified lost and found system for De La Salle Araneta University."
    },
    @{
        File = "voice_scene3_feed.wav"
        Text = "Explore the campus discovery feed. Filter instantly by item category, campus location, and date."
    },
    @{
        File = "voice_scene4_report.wav"
        Text = "Report lost or found items in seconds with photo proof, zone tagging, and live tracking."
    },
    @{
        File = "voice_scene5_admin.wav"
        Text = "Empowering the Disciplinary Office with claims verification, intake custody, and a complete audit log."
    },
    @{
        File = "voice_scene6_tech.wav"
        Text = "Engineered with Astro 5, React 19, Tailwind CSS, and Supabase."
    },
    @{
        File = "voice_scene7_outro.wav"
        Text = "LostLink. Reconnect with what matters on campus. Made by Group 3."
    }
)

foreach ($n in $narrations) {
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    # Select clear female voice (Microsoft Zira) or David
    try {
        $synth.SelectVoice("Microsoft Zira Desktop")
    } catch {
        # Fallback to default
    }
    $synth.Rate = 0  # Normal speed, clear pronunciation
    $synth.Volume = 100

    $out1 = Join-Path "assets" $n.File
    $out2 = Join-Path "public/assets" $n.File

    $synth.SetOutputToWaveFile($out1)
    $synth.Speak($n.Text)
    $synth.Dispose()

    Copy-Item $out1 $out2 -Force
    Write-Host "Generated: $out1"
}

Write-Host "All voiceovers generated successfully!"
