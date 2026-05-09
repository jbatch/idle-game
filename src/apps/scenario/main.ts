import '../../style.css'
import { createPhaserGame } from '../../game/createPhaserGame'
import { ScenarioBootScene } from '../../tools/scenario/ScenarioBootScene'
import { ScenarioScene } from '../../tools/scenario/ScenarioScene'

createPhaserGame([ScenarioBootScene, ScenarioScene], 'app')
